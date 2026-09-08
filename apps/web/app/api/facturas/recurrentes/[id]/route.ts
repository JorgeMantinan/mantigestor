import { NextResponse, type NextRequest } from 'next/server'
import { getAuthenticatedUser, getSupabaseServer, unauthorized, serverError } from '@/lib/api-helpers'
import { resolvePerfilActivo } from '@/lib/resolve-perfil-activo'
import { rateLimitByIp } from '@/lib/rate-limit-ip'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { success } = rateLimitByIp(req, { maxRequests: 10, windowMs: 60 * 1000 })
    if (!success) {
      return NextResponse.json(
        { error: 'Demasiadas peticiones. Intenta de nuevo en un minuto.' },
        { status: 429 }
      )
    }

    const user = await getAuthenticatedUser(req)
    if (!user) return unauthorized()

    const { perfilId } = await resolvePerfilActivo(req)

    const body = await req.json()
    const updates: Record<string, unknown> = {}
    if (body.activa !== undefined) updates.activa = body.activa
    if (body.diaGeneracion !== undefined) updates.diaGeneracion = body.diaGeneracion
    if (body.diaEmail !== undefined) updates.diaEmail = body.diaEmail
    if (body.notas !== undefined) updates.notas = body.notas
    if (body.tipo !== undefined) updates.tipo = body.tipo
    if (body.numero !== undefined) updates.numero = body.numero
    if (body.emisorReceptor !== undefined) updates.emisorReceptor = body.emisorReceptor
    if (body.nifContraparte !== undefined) updates.nifContraparte = body.nifContraparte
    if (body.baseImponible !== undefined) updates.baseImponible = body.baseImponible
    if (body.iva !== undefined) updates.iva = body.iva

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
    const { success } = rateLimitByIp(req, { maxRequests: 10, windowMs: 60 * 1000 })
    if (!success) {
      return NextResponse.json(
        { error: 'Demasiadas peticiones. Intenta de nuevo en un minuto.' },
        { status: 429 }
      )
    }

    const user = await getAuthenticatedUser(req)
    if (!user) return unauthorized()

    const { perfilId } = await resolvePerfilActivo(req)

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
