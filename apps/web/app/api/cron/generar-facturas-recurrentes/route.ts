import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Cron job: /api/cron/generar-facturas-recurrentes
 *
 * Llamar una vez al día. Genera facturas automáticas desde plantillas recurrentes
 * cuyo diaGeneracion coincide con el día actual.
 */

interface FacturaRecurrente {
  id: string
  perfilId: string
  tipo: string
  emisorReceptor: string
  nifContraparte: string | null
  baseImponible: number
  iva: number
  categoriaGasto: string | null
  diaGeneracion: number
  activa: boolean
  pdfUrl: string | null
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()
  const hoy = new Date()
  const diaActual = hoy.getDate()

  // Get all active recurring invoices for today
  const { data: recurrentes } = await supabase
    .from('facturas_recurrentes')
    .select('*')
    .eq('activa', true)
    .eq('diaGeneracion', diaActual)

  if (!recurrentes || recurrentes.length === 0) {
    return NextResponse.json({ generated: 0 })
  }

  let generated = 0

  for (const rec of recurrentes as FacturaRecurrente[]) {
    try {
      const baseImponible = rec.baseImponible
      const iva = rec.iva
      const importeIva = Math.round(baseImponible * (iva / 100))
      const total = baseImponible + importeIva

      // Generate invoice number: F-YYYY-MM-NNN
      const anyo = hoy.getFullYear()
      const mes = String(hoy.getMonth() + 1).padStart(2, '0')
      const { count } = await supabase
        .from('facturas')
        .select('*', { count: 'exact', head: true })
        .eq('perfilId', rec.perfilId)
        .like('numero', `F-${anyo}-${mes}-%`)

      const num = String((count ?? 0) + 1).padStart(3, '0')
      const numero = `F-${anyo}-${mes}-${num}`

      const { error } = await supabase.from('facturas').insert({
        id: crypto.randomUUID(),
        perfilId: rec.perfilId,
        numero,
        tipo: rec.tipo,
        emisorReceptor: rec.emisorReceptor,
        nifContraparte: rec.nifContraparte,
        fechaEmision: hoy.toISOString().slice(0, 10),
        baseImponible,
        iva,
        total,
        estado: 'pendiente',
        categoriaGasto: rec.categoriaGasto,
        createdAt: new Date().toISOString(),
      })

      if (!error) generated++
    } catch (e) {
      console.error('Error generando factura recurrente:', e)
    }
  }

  return NextResponse.json({ generated })
}
