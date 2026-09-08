import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { z } from 'zod'
import { getAuthenticatedUser, unauthorized, badRequest, serverError } from '@/lib/api-helpers'
import { rateLimitByIp } from '@/lib/rate-limit-ip'
import { resolvePerfilActivo } from '@/lib/resolve-perfil-activo'

const ConciliarSchema = z.object({
  movimientoId: z.string().min(1),
  facturaId: z.string().min(1),
  puntuacion: z.number().int().min(0).max(100),
  accion: z.enum(['auto', 'manual']),
})

function supabaseDeReq(req: NextRequest) {
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

    const { perfilId } = await resolvePerfilActivo(req)

    const body: unknown = await req.json()
    const parsed = ConciliarSchema.safeParse(body)
    if (!parsed.success) return badRequest(parsed.error.flatten().fieldErrors)

    const supabase = supabaseDeReq(req)

    // Verify ownership of the movement
    const { data: movimiento, error: movError } = await supabase
      .from('movimientos_banco')
      .select('id, perfilId')
      .eq('id', parsed.data.movimientoId)
      .eq('perfilId', perfilId)
      .single()

    if (movError || !movimiento) {
      return badRequest('Movimiento no encontrado o sin acceso')
    }

    // Verify ownership of the invoice
    const { data: factura, error: factError } = await supabase
      .from('facturas')
      .select('id, perfilId')
      .eq('id', parsed.data.facturaId)
      .eq('perfilId', perfilId)
      .single()

    if (factError || !factura) {
      return badRequest('Factura no encontrada o sin acceso')
    }

    // 1. Update movement: mark as conciliado and link to invoice
    const { error: updateMovError } = await supabase
      .from('movimientos_banco')
      .update({
        conciliado: true,
        facturaId: parsed.data.facturaId,
      })
      .eq('id', parsed.data.movimientoId)

    if (updateMovError) throw updateMovError

    // 2. Insert reconciliation log
    const { error: insertLogError } = await supabase
      .from('conciliacion_logs')
      .insert({
        id: crypto.randomUUID(),
        perfilId,
        movimientoId: parsed.data.movimientoId,
        facturaId: parsed.data.facturaId,
        puntuacion: parsed.data.puntuacion,
        accion: parsed.data.accion,
        creadoEn: new Date().toISOString(),
      })

    if (insertLogError) throw insertLogError

    // 3. Update invoice status to 'pagada'
    const { error: updateFactError } = await supabase
      .from('facturas')
      .update({ estado: 'pagada' })
      .eq('id', parsed.data.facturaId)

    if (updateFactError) throw updateFactError

    return Response.json({ success: true })
  } catch (error) {
    return serverError(error)
  }
}
