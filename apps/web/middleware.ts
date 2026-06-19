import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const RUTAS_PUBLICAS = ['/', '/login', '/register', '/precios', '/sobre-nosotros', '/auth/callback']
const RUTAS_SOLO_PRO = ['/ai', '/alumnos/examenes']
const RUTAS_BASIC_PLUS = ['/gestoria/trimestres', '/gestoria/renta', '/alquiler', '/nominas']

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

function findAccessToken(cookies: ReturnType<NextRequest['cookies']['getAll']>): string | null {
  for (const c of cookies) {
    if (c.name.includes('auth-token')) {
      try {
        const parsed = JSON.parse(c.value)
        if (parsed.access_token) return parsed.access_token
      } catch {
        if (c.value.startsWith('eyJ')) return c.value
      }
    }
  }
  return null
}

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const ruta = req.nextUrl.pathname

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
      const queryUrl = `${supabaseUrl}/rest/v1/suscripciones?perfilId=eq.${userId}&estado=in.(active,trialing)&order=currentPeriodStart.desc&limit=1`
      const qres = await fetch(queryUrl, {
        headers: { apikey: supabaseKey, Authorization: `Bearer ${token}` },
      })
      const data: { tier?: string }[] = qres.ok ? await qres.json() : []
      const esPro = data[0]?.tier === 'PRO'
      const esBasic = data[0]?.tier === 'BASIC' || data.length === 0
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
