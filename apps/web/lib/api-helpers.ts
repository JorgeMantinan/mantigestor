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
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export async function getSupabaseServer(req: NextRequest) {
  return createServerClient(
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
}

export function unauthorized() {
  return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
}

export function notFound(mensaje = 'No encontrado') {
  return NextResponse.json({ error: mensaje }, { status: 404 })
}

export function badRequest(error: unknown) {
  const mensaje = typeof error === 'string'
    ? error
    : error instanceof Error ? error.message : 'Solicitud inválida'
  return NextResponse.json({ error: mensaje }, { status: 400 })
}

export function serverError(error: unknown) {
  // Solo message: los PostgrestError traen `details` con valores de fila
  // (emails, NIFs) que no deben acabar en los logs de Vercel
  if (error && typeof error === 'object' && 'message' in error) {
    console.error(String((error as { message: unknown }).message))
  } else {
    console.error(error)
  }
  return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
}
