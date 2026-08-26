import { NextResponse, type NextRequest } from 'next/server'
import { getAuthenticatedUser, unauthorized, serverError } from '@/lib/api-helpers'
import { createClient } from '@/lib/supabase/client'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getAuthenticatedUser(req)
    if (!user) return unauthorized()

    const body = await req.json()
    const updates: Record<string, unknown> = {}
    if (body.activa !== undefined) updates.activa = body.activa
    if (body.diaGeneracion !== undefined) updates.diaGeneracion = body.diaGeneracion
    if (body.diaEmail !== undefined) updates.diaEmail = body.diaEmail

    const { error } = await createClient()
      .from('facturas_recurrentes')
      .update(updates)
      .eq('id', params.id)
      .eq('perfilId', user.id)

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

    const { error } = await createClient()
      .from('facturas_recurrentes')
      .delete()
      .eq('id', params.id)
      .eq('perfilId', user.id)

    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (error) {
    return serverError(error)
  }
}
