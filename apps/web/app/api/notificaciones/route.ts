import { type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { getAuthenticatedUser, unauthorized, badRequest, serverError } from '@/lib/api-helpers'

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req)
    if (!user) return unauthorized()

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

    const body = await req.json()
    const { perfilId, tipo, contenido } = body

    if (!perfilId || !tipo || !contenido) {
      return badRequest(new Error('Faltan campos requeridos: perfilId, tipo, contenido'))
    }

    if (typeof tipo !== 'string' || typeof contenido !== 'string') {
      return badRequest(new Error('tipo y contenido deben ser strings'))
    }

    const { data, error } = await supabase
      .from('notificaciones')
      .insert({ perfilId, tipo, contenido })
      .select()
      .single()

    if (error) throw error

    return Response.json({ data }, { status: 201 })
  } catch (error) {
    return serverError(error)
  }
}
