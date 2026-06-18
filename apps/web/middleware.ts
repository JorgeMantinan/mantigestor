import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const RUTAS_PUBLICAS = ['/', '/login', '/register', '/precios', '/sobre-nosotros']

const RUTAS_SOLO_PRO = [
  '/dashboard/ai',
  '/dashboard/alumnos/examenes',
  '/dashboard/renta/asistente'
]

const RUTAS_BASIC_PLUS = [
  '/dashboard/gestoria/trimestres',
  '/dashboard/alquiler',
  '/dashboard/nominas'
]

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const ruta = req.nextUrl.pathname

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name: string) => req.cookies.get(name)?.value,
        set: (name: string, value: string, options: Record<string, unknown>) => res.cookies.set({ name, value, ...options }),
        remove: (name: string, options: Record<string, unknown>) => res.cookies.set({ name, value: '', ...options }),
      },
    }
  )

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
      .eq('estado', 'active')
      .order('currentPeriodStart', { ascending: false })
      .limit(1)
      .single()

    const esPro = suscripcion?.tier === 'PRO'
    const esBasicPlus = suscripcion?.tier === 'BASIC' || esPro

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
