import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * GET /api/cliente-portal?token=xxx
 * Returns ALL invoices for a client identified by tokenCliente.
 * Backward-compatible: if the token matches a single factura ID, returns that invoice's client token
 * and then fetches all invoices for the same client.
 */

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')
  if (!token) {
    return NextResponse.json({ error: 'Token requerido' }, { status: 400 })
  }

  const supabase = createAdminClient()

  // First, try to find a factura with this token as tokenCliente
  let { data: invoices, error } = await supabase
    .from('facturas')
    .select('id, numero, tipo, emisorReceptor, nifContraparte, fechaEmision, fechaVencimiento, baseImponible, iva, total, estado, notas, tokenCliente')
    .eq('tokenCliente', token)
    .eq('tipo', 'ingreso')
    .order('fechaEmision', { ascending: false })

  if (error) {
    return NextResponse.json({ error: 'Error al consultar facturas' }, { status: 500 })
  }

  // Backward compatibility: if no invoices found by tokenCliente, try by factura ID
  if (!invoices || invoices.length === 0) {
    const { data: single } = await supabase
      .from('facturas')
      .select('id, numero, tipo, emisorReceptor, nifContraparte, fechaEmision, fechaVencimiento, baseImponible, iva, total, estado, notas, tokenCliente')
      .eq('id', token)
      .eq('tipo', 'ingreso')
      .single()

    if (single) {
      // If this invoice has a tokenCliente, fetch all for that client
      if (single.tokenCliente) {
        const { data: allForClient } = await supabase
          .from('facturas')
          .select('id, numero, tipo, emisorReceptor, nifContraparte, fechaEmision, fechaVencimiento, baseImponible, iva, total, estado, notas, tokenCliente')
          .eq('tokenCliente', single.tokenCliente)
          .eq('tipo', 'ingreso')
          .order('fechaEmision', { ascending: false })

        if (allForClient && allForClient.length > 0) {
          return NextResponse.json({ facturas: allForClient, tokenCliente: single.tokenCliente })
        }
      }
      // Fallback: return single invoice
      return NextResponse.json({ facturas: [single], tokenCliente: null })
    }

    return NextResponse.json({ error: 'Factura no encontrada' }, { status: 404 })
  }

  return NextResponse.json({ facturas: invoices, tokenCliente: token })
}
