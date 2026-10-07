import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// CSP con nonce por petición (M10): sin 'unsafe-inline' en script-src.
// Next extrae el nonce del header Content-Security-Policy de la PETICIÓN y lo
// aplica a sus scripts (bundles, bootstrap, inline); 'strict-dynamic' cubre los
// scripts inyectados en runtime (next/script, swagger, stripe). Por eso las
// páginas se fuerzan a render dinámico en app/layout.tsx — un HTML pre-renderizado
// no llevaría nonce y quedaría bloqueado.
function generarCSP(nonce: string): string {
  const esDev = process.env.NODE_ENV === 'development'
  return [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${esDev ? " 'unsafe-eval'" : ''} https://js.stripe.com`,
    // Mata cualquier handler inline (onerror=...): el nonce no protege los handlers
    "script-src-attr 'none'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https://*.supabase.co https://js.stripe.com",
    "font-src 'self' data:",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.stripe.com https://m.stripe.network https://api.frankfurter.dev",
    "frame-src 'self' blob: https://js.stripe.com https://hooks.stripe.com https://m.stripe.network",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    ...(esDev ? [] : ['upgrade-insecure-requests']),
  ].join('; ')
}

// Páginas públicas (las rutas /api/* no aparecen aquí: cada handler se
// autentica solo — webhook de Stripe por firma, crons por CRON_SECRET, el
// resto con getAuthenticatedUser). El middleware solo gobierna PÁGINAS.
const RUTAS_PUBLICAS = [
  '/',
  '/login',
  '/register',
  '/precios',
  '/sobre-nosotros',
  '/auth/callback',
  '/forgot-password',
  '/reset-password',
  '/demo',
  '/confirmar-asociacion',
  '/factura',
  '/sw.js',
  '/robots.txt',
  '/manifest.json',
  '/site.webmanifest',
]

// Solo se requiere plan PRO para lo que usa IA (regla del producto):
// el asistente de IA. Todo lo demás (nóminas, conversiones, trimestres,
// renta, alquiler...) es BASIC y solo requiere sesión.
const RUTAS_SOLO_PRO = ['/ai']

interface CacheEntry {
  tier?: string
  expiraEn: number
}
const suscripcionCache = new Map<string, CacheEntry>()
const SUSCRIPCION_TTL_MS = 60_000

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function decodeJWTPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const payload = parts[1]
    if (!payload) return null
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/')
    return JSON.parse(atob(base64))
  } catch {
    return null
  }
}

function base64URLDecode(input: string): string {
  const base64 = input.replace(/-/g, '+').replace(/_/g, '/')
  const padding = 4 - (base64.length % 4)
  return atob(padding < 4 ? base64 + '='.repeat(padding) : base64)
}

function findAccessToken(cookies: ReturnType<NextRequest['cookies']['getAll']>): string | null {
  const grouped = new Map<string, { suffix: number; value: string }[]>()

  for (const c of cookies) {
    if (!c.name.includes('auth-token')) continue

    let baseName = c.name
    let suffix = 0
    const dotIndex = c.name.lastIndexOf('.')
    if (dotIndex > 0) {
      const num = parseInt(c.name.slice(dotIndex + 1), 10)
      if (!isNaN(num)) {
        baseName = c.name.slice(0, dotIndex)
        suffix = num
      }
    }

    let arr = grouped.get(baseName)
    if (!arr) {
      arr = []
      grouped.set(baseName, arr)
    }
    arr.push({ suffix, value: c.value })
  }

  for (const [, chunks] of grouped) {
    chunks.sort((a, b) => a.suffix - b.suffix)
    let combined = chunks.map(c => c.value).join('')

    if (combined.startsWith('base64-')) {
      combined = base64URLDecode(combined.slice(7))
    }

    try {
      const parsed = JSON.parse(combined)
      if (parsed.access_token) return parsed.access_token
    } catch {
      if (combined.startsWith('eyJ')) return combined
    }
  }

  return null
}

export async function middleware(req: NextRequest) {
  const ruta = req.nextUrl.pathname

  // Pasar perfilActivoId como header para server components y API routes
  const perfilActivoId = req.cookies.get('perfilActivoId')?.value
  // Borrar SIEMPRE la cabecera que llegue del cliente: sin cookie no debe
  // viajar un x-perfil-activo manipulado (las APIs lo revalidan igualmente,
  // pero no hace falta dejarlo pasar)
  req.headers.delete('x-perfil-activo')
  if (perfilActivoId) {
    req.headers.set('x-perfil-activo', perfilActivoId)
  }

  // Nonce + CSP: se pasan en la petición (Next los lee para firmar sus
  // scripts) y en la respuesta (el navegador los aplica al documento)
  const nonce = btoa(crypto.randomUUID())
  const csp = generarCSP(nonce)
  const requestHeaders = new Headers(req.headers)
  requestHeaders.set('x-nonce', nonce)
  requestHeaders.set('Content-Security-Policy', csp)
  const res = NextResponse.next({ request: { headers: requestHeaders } })
  res.headers.set('Content-Security-Policy', csp)

  // /api/* fuera del gate de cookies: no hay sesión que verificar aquí.
  // (Si no, el webhook de Stripe y los crons —que no llevan cookies— se
  // redirigían a /login y nunca se ejecutarían.)
  if (ruta.startsWith('/api/')) {
    return res
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    // Sin env vars no hay sesión posible; nunca redirigir "/" a sí mismo
    // (bucle infinito de redirecciones).
    return ruta.startsWith('/_next') || ruta === '/'
      ? res
      : NextResponse.redirect(new URL('/', req.url))
  }

  const token = findAccessToken(req.cookies.getAll())
  const payload = token ? decodeJWTPayload(token) : null
  const subCrudo = payload?.sub ?? null
  const userId = typeof subCrudo === 'string' ? subCrudo : null

  if (!userId && !RUTAS_PUBLICAS.some(r => ruta === r || ruta.startsWith(r + '/'))) {
    const url = req.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('redirect', ruta)
    return NextResponse.redirect(url)
  }

  // Gate de plan PRO (solo rutas con IA). La verificación real de sesión se
  // hace en app/(dashboard)/layout.tsx con auth.getUser(); aquí es solo UX.
  if (userId && RUTAS_SOLO_PRO.some(r => ruta.startsWith(r))) {
    try {
      const perfilId = perfilActivoId ?? userId
      if (!UUID_REGEX.test(perfilId)) throw new Error('perfilId inválido')
      const now = Date.now()

      const cacheKey = `${userId}:${perfilId}`
      const cached = suscripcionCache.get(cacheKey)
      let tier: string | undefined
      if (cached && cached.expiraEn > now) {
        tier = cached.tier
      } else {
        const queryUrl = `${supabaseUrl}/rest/v1/suscripciones?perfilId=eq.${perfilId}&estado=in.(active,trialing)&order=currentPeriodStart.desc&limit=1`
        const qres = await fetch(queryUrl, {
          headers: { apikey: supabaseKey, Authorization: `Bearer ${token}` },
        })
        const data: { tier?: string }[] = qres.ok ? await qres.json() : []
        tier = data[0]?.tier
        suscripcionCache.set(cacheKey, { tier, expiraEn: now + SUSCRIPCION_TTL_MS })
      }

      if (tier !== 'PRO') {
        return NextResponse.redirect(new URL('/precios?requiere=pro', req.url))
      }
    } catch {
      // degradación graceful (el gate de la API de IA es la barrera real)
    }
  }

  return res
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
