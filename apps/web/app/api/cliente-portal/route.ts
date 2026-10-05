import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { rateLimitByIp } from '@/lib/rate-limit-ip'

/**
 * GET /api/cliente-portal?token=xxx
 * Devuelve TODAS las facturas del cliente identificado por su tokenCliente.
 * Un ID de factura NO sirve como token (antes había un fallback que convertía
 * cualquier UUID de factura en un bearer de lectura).
 */

export async function GET(req: NextRequest) {
  try {
    const { success } = await rateLimitByIp(req)
    if (!success) {
      return NextResponse.json({ error: 'Demasiadas peticiones' }, { status: 429 })
    }

    const token = req.nextUrl.searchParams.get('token')
    if (!token) {
      return NextResponse.json({ error: 'Token requerido' }, { status: 400 })
    }

    const supabase = createAdminClient()

    const { data: invoices, error } = await supabase
      .from('facturas')
      .select('id, numero, tipo, emisorReceptor, nifContraparte, fechaEmision, fechaVencimiento, baseImponible, iva, total, estado, notas, tokenCliente')
      .eq('tokenCliente', token)
      .eq('tipo', 'ingreso')
      .order('fechaEmision', { ascending: false })

    if (error) {
      return NextResponse.json({ error: 'Error al consultar facturas' }, { status: 500 })
    }

    if (!invoices || invoices.length === 0) {
      return NextResponse.json({ error: 'Factura no encontrada' }, { status: 404 })
    }

    return NextResponse.json({ facturas: invoices, tokenCliente: token })
  } catch (err) {
    console.error('Error in cliente-portal:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
