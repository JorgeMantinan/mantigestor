import { createServerClient } from '@supabase/ssr'
import { type NextRequest, NextResponse } from 'next/server'

export async function getAuthenticatedUser(req: NextRequest) {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name: string) => req.cookies.get(name)?.value,
        set: () => {},
        remove: () => {},
      },
    }
  )
  const { data: { session } } = await supabase.auth.getSession()
  return session?.user ?? null
}

export function unauthorized() {
  return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
}

export function notFound(mensaje = 'No encontrado') {
  return NextResponse.json({ error: mensaje }, { status: 404 })
}

export function badRequest(error: unknown) {
  const mensaje = error instanceof Error ? error.message : 'Solicitud inválida'
  return NextResponse.json({ error: mensaje }, { status: 400 })
}

export function serverError(error: unknown) {
  console.error(error)
  return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
}
