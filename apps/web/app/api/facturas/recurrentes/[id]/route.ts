import { NextResponse, type NextRequest } from 'next/server'
import { getAuthenticatedUser, getSupabaseServer, unauthorized, badRequest, serverError } from '@/lib/api-helpers'
import { resolvePerfilActivo, esSoloLectura } from '@/lib/resolve-perfil-activo'
import { rateLimitByIp } from '@/lib/rate-limit-ip'
import { z } from 'zod'

const ActualizarPlantillaSchema = z.object({
  activa: z.boolean().optional(),
  diaGeneracion: z.number().int().min(1).max(28).optional(),
  diaEmail: z.number().int().min(1).max(28).nullable().optional(),
  notas: z.string().max(2000).nullable().optional(),
  tipo: z.string().min(1).max(30).optional(),
  numero: z.string().min(1).max(50).optional(),
  emisorReceptor: z.string().min(1).max(200).optional(),
  nifContraparte: z.string().max(20).nullable().optional(),
  baseImponible: z.number().min(0).max(1000000000).optional(),
  iva: z.union([z.literal(0), z.literal(4), z.literal(10), z.literal(21)]).optional(),
})

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { success } = await rateLimitByIp(req, { maxRequests: 10, windowMs: 60 * 1000 })
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

    const body = await req.json().catch(() => null)
    const parsed = ActualizarPlantillaSchema.safeParse(body)
    if (!parsed.success) {
      return badRequest(parsed.error.flatten().fieldErrors)
    }
    const updates = parsed.data

    const supabase = await getSupabaseServer(req)
    const { error } = await supabase
      .from('facturas_recurrentes')
      .update(updates)
      .eq('id', params.id)
      .eq('perfilId', perfilId)

    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (error) {
    return serverError(error)
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { success } = await rateLimitByIp(req, { maxRequests: 10, windowMs: 60 * 1000 })
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

    const supabase = await getSupabaseServer(req)
    const { error } = await supabase
      .from('facturas_recurrentes')
      .delete()
      .eq('id', params.id)
      .eq('perfilId', perfilId)

    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (error) {
    return serverError(error)
  }
}
