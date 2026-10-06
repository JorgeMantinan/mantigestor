import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { getAuthenticatedUser, unauthorized, badRequest, serverError } from '@/lib/api-helpers'
import { rateLimitByIp } from '@/lib/rate-limit-ip'
import { resolvePerfilActivo, esSoloLectura } from '@/lib/resolve-perfil-activo'
import { z } from 'zod'

const VersionSchema = z.object({
  entidad: z.string().min(1),
  entidadId: z.string().min(1),
  version: z.number().int().positive(),
  datos: z.record(z.unknown()),
})

export async function GET(req: NextRequest) {
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

    const url = new URL(req.url)
    const entidad = url.searchParams.get('entidad')
    const entidadId = url.searchParams.get('entidadId')

    if (!entidad || !entidadId) {
      return badRequest('Parámetros entidad y entidadId requeridos')
    }

    const { data, error } = await supabase
      .from('versiones_registro')
      .select('*')
      .eq('perfilId', perfilId)
      .eq('entidad', entidad)
      .eq('entidadId', entidadId)
      .order('version', { ascending: false })

    if (error) throw error
    return Response.json({ data: data ?? [] })
  } catch (error) {
    return serverError(error)
  }
}

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

    const { perfilId, rol } = await resolvePerfilActivo(req)
    // Escritura bloqueada para perfiles en modo solo lectura (visualizador)
    if (esSoloLectura(rol)) {
      return NextResponse.json({ error: 'El perfil está en modo solo lectura' }, { status: 403 })
    }

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
    const parsed = VersionSchema.safeParse(body)
    if (!parsed.success) return badRequest(parsed.error.flatten().fieldErrors)

    const { data, error } = await supabase
      .from('versiones_registro')
      .insert({
        id: crypto.randomUUID(),
        perfilId,
        entidad: parsed.data.entidad,
        entidadId: parsed.data.entidadId,
        version: parsed.data.version,
        datos: parsed.data.datos,
        usuarioId: user.id,
        creadoEn: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) throw error
    return Response.json({ data })
  } catch (error) {
    return serverError(error)
  }
}
