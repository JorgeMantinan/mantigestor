import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const RUTAS_PUBLICAS = ['/', '/login', '/register', '/precios', '/sobre-nosotros']

const RUTAS_SOLO_PRO = [
  '/ai',
  '/alumnos/examenes',
]

const RUTAS_BASIC_PLUS = [
  '/gestoria/trimestres',
  '/gestoria/renta',
  '/alquiler',
  '/nominas'
]

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const ruta = req.nextUrl.pathname

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    return ruta.startsWith('/_next') ? res : NextResponse.redirect(new URL('/', req.url))
  }

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll: () => req.cookies.getAll().map(({ name, value }) => ({ name, value })),
      setAll: (cookiesToSet, headers) => {
        cookiesToSet.forEach(({ name, value, options }) => res.cookies.set(name, value, options))
        Object.entries(headers).forEach(([key, value]) => res.headers.set(key, value))
      },
    },
  })

  const { data: { user } } = await supabase.auth.getUser()

  if (!user && !RUTAS_PUBLICAS.some(r => ruta === r || ruta.startsWith(r + '/'))) {
    const url = req.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('redirect', ruta)
    return NextResponse.redirect(url)
  }

  if (user && (RUTAS_SOLO_PRO.some(r => ruta.startsWith(r)) || RUTAS_BASIC_PLUS.some(r => ruta.startsWith(r)))) {
    const { data: suscripcion } = await supabase
      .from('suscripciones')
      .select('tier')
      .eq('perfilId', user.id)
      .in('estado', ['active', 'trialing'])
      .order('currentPeriodStart', { ascending: false })
      .limit(1)
      .maybeSingle()

    const esPro = suscripcion?.tier === 'PRO'
    const esBasic = suscripcion?.tier === 'BASIC' || suscripcion === null
    const esBasicPlus = esBasic || esPro

    if (RUTAS_SOLO_PRO.some(r => ruta.startsWith(r)) && !esPro) {
      return NextResponse.redirect(new URL('/precios?requiere=pro', req.url))
    }

    if (RUTAS_BASIC_PLUS.some(r => ruta.startsWith(r)) && !esBasicPlus) {
      return NextResponse.redirect(new URL('/precios?requiere=basic', req.url))
    }
  }

  return res
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)']
}
