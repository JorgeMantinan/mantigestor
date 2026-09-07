import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { rateLimitByIp } from '@/lib/rate-limit-ip'

/**
 * GET /api/factura-publica?token=xxx
 * Returns invoice data for public viewing (client portal).
 * The token is a signed URL or a simple UUID stored in the factura.
 *
 * NOTE: This endpoint is intentionally public (no auth) — it serves
 * invoice data to clients via a shareable token link.
 */

export async function GET(req: NextRequest) {
  try {
    const { success } = rateLimitByIp(req)
    if (!success) {
      return NextResponse.json({ error: 'Demasiadas peticiones' }, { status: 429 })
    }

    const token = req.nextUrl.searchParams.get('token')
    if (!token) {
      return NextResponse.json({ error: 'Token requerido' }, { status: 400 })
    }

    const supabase = createAdminClient()

    const { data: factura, error } = await supabase
      .from('facturas')
      .select('id, numero, tipo, emisorReceptor, nifContraparte, fechaEmision, baseImponible, iva, total, estado, notas')
      .eq('tokenCliente', token)
      .single()

    if (error || !factura) {
      return NextResponse.json({ error: 'Factura no encontrada' }, { status: 404 })
    }

    // Only show emitidas (client-facing)
    if (factura.tipo !== 'ingreso') {
      return NextResponse.json({ error: 'Solo facturas emitidas son públicas' }, { status: 403 })
    }

    return NextResponse.json(factura)
  } catch (err) {
    console.error('Error in factura-publica:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
