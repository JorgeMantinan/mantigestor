import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { getAuthenticatedUser, unauthorized, badRequest, serverError } from '@/lib/api-helpers'
import { rateLimitByIp } from '@/lib/rate-limit-ip'
import { resolvePerfilActivo } from '@/lib/resolve-perfil-activo'

export async function POST(req: NextRequest) {
  try {
    const { success } = await rateLimitByIp(req)
    if (!success) {
      return NextResponse.json(
        { error: 'Demasiadas peticiones. Intenta de nuevo en un minuto.' },
        { status: 429 }
      )
    }
    const user = await getAuthenticatedUser(req)
    if (!user) return unauthorized()

    const { perfilId } = await resolvePerfilActivo(req)

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

    if (tipo.length === 0 || tipo.length > 50 || contenido.length > 2000) {
      return badRequest(new Error('tipo (máx. 50) o contenido (máx. 2000) demasiado largos'))
    }

    const { data, error } = await supabase
      .from('notificaciones')
      .insert({ id: crypto.randomUUID(), perfilId, tipo, contenido, creadoEn: new Date().toISOString() })
      .select()
      .single()

    if (error) throw error

    return Response.json({ data }, { status: 201 })
  } catch (error) {
    return serverError(error)
  }
}
