import { NextResponse, type NextRequest } from 'next/server'
import { getAuthenticatedUser, getSupabaseServer, unauthorized, serverError } from '@/lib/api-helpers'
import { resolvePerfilActivo } from '@/lib/resolve-perfil-activo'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getAuthenticatedUser(req)
    if (!user) return unauthorized()

    const { perfilId } = await resolvePerfilActivo(req)

    const body = await req.json()
    const updates: Record<string, unknown> = {}
    if (body.activa !== undefined) updates.activa = body.activa
    if (body.diaGeneracion !== undefined) updates.diaGeneracion = body.diaGeneracion
    if (body.diaEmail !== undefined) updates.diaEmail = body.diaEmail
    if (body.notas !== undefined) updates.notas = body.notas

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
