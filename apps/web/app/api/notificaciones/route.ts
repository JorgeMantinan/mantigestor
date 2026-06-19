import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { getAuthenticatedUser, unauthorized, badRequest, serverError } from '@/lib/api-helpers'
import { rateLimitByIp } from '@/lib/rate-limit-ip'

export async function POST(req: NextRequest) {
  try {
    const { success } = rateLimitByIp(req)
    if (!success) {
      return NextResponse.json(
        { error: 'Demasiadas peticiones. Intenta de nuevo en un minuto.' },
        { status: 429 }
      )
    }
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
    const { tipo, contenido } = body

    if (!tipo || !contenido) {
      return badRequest(new Error('Faltan campos requeridos: tipo, contenido'))
    }

    if (typeof tipo !== 'string' || typeof contenido !== 'string') {
      return badRequest(new Error('tipo y contenido deben ser strings'))
    }

    const { data, error } = await supabase
      .from('notificaciones')
      .insert({ id: crypto.randomUUID(), perfilId: user.id, tipo, contenido })
      .select()
      .single()

    if (error) throw error

    return Response.json({ data }, { status: 201 })
  } catch (error) {
    return serverError(error)
  }
}
