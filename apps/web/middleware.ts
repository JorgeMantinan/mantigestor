import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const RUTAS_PUBLICAS = ['/', '/login', '/register', '/precios', '/sobre-nosotros', '/auth/callback', '/forgot-password', '/reset-password', '/demo', '/api/tipos-cambio']
const RUTAS_SOLO_PRO = ['/ai']
const RUTAS_BASIC_PLUS = ['/gestoria/trimestres', '/gestoria/renta', '/alquiler', '/nominas']

interface CacheEntry {
  tier?: string
  expiraEn: number
}
const suscripcionCache = new Map<string, CacheEntry>()
const SUSCRIPCION_TTL_MS = 60_000

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
  const res = NextResponse.next()
  const ruta = req.nextUrl.pathname

  // Pasar perfilActivoId como header para server components y API routes
  const perfilActivoId = req.cookies.get('perfilActivoId')?.value
  if (perfilActivoId) {
    req.headers.set('x-perfil-activo', perfilActivoId)
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    return ruta.startsWith('/_next') ? res : NextResponse.redirect(new URL('/', req.url))
  }

  const token = findAccessToken(req.cookies.getAll())
  const payload = token ? decodeJWTPayload(token) : null
  const userId = payload?.sub ?? null

  if (!userId && !RUTAS_PUBLICAS.some(r => ruta === r || ruta.startsWith(r + '/'))) {
    const url = req.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('redirect', ruta)
    return NextResponse.redirect(url)
  }

  if (userId && (RUTAS_SOLO_PRO.some(r => ruta.startsWith(r)) || RUTAS_BASIC_PLUS.some(r => ruta.startsWith(r)))) {
    try {
      const perfilId = perfilActivoId ?? userId
      const now = Date.now()
      let tier: string | undefined
      let pagoActivo = false

      const cacheKey = `${userId}:${perfilId}`
      const cached = suscripcionCache.get(cacheKey)
      if (cached && cached.expiraEn > now) {
        tier = 'BASIC'
        if (cached.tier) {
          tier = cached.tier
        }
      } else {
        const queryUrl = `${supabaseUrl}/rest/v1/suscripciones?perfilId=eq.${perfilId}&estado=in.(active,trialing)&order=currentPeriodStart.desc&limit=1`
        const qres = await fetch(queryUrl, {
          headers: { apikey: supabaseKey, Authorization: `Bearer ${token}` },
        })
        const data: { tier?: string }[] = qres.ok ? await qres.json() : []
        tier = data[0]?.tier
        pagoActivo = data.length > 0
        suscripcionCache.set(cacheKey, { tier, expiraEn: now + SUSCRIPCION_TTL_MS })
      }

      const esPro = tier === 'PRO'
      const esBasic = tier === 'BASIC' || !pagoActivo
      const esBasicPlus = esBasic || esPro

      if (RUTAS_SOLO_PRO.some(r => ruta.startsWith(r)) && !esPro) {
        return NextResponse.redirect(new URL('/precios?requiere=pro', req.url))
      }
      if (RUTAS_BASIC_PLUS.some(r => ruta.startsWith(r)) && !esBasicPlus) {
        return NextResponse.redirect(new URL('/precios?requiere=basic', req.url))
      }
    } catch {
      // degradación graceful
    }
  }

  return res
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)']
}
