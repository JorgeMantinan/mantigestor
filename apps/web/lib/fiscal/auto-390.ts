import { createClient } from '@/lib/supabase/client'
import { resultadosIvaAnuales, calcularModelo390, type ResultadoModelo303, type FacturaFiscalMinima } from '@mantigestor/utils'

interface Factura {
  id: string
  tipo: string
  baseImponible: number
  iva: number
  importeIva: number
  total: number
  fechaEmision: string
  deducible: boolean | null
}

export interface Resultado390Automatico {
  resultados: ResultadoModelo303[]
  totalFacturas: number
  totalIngresos: number
  totalGastos: number
}

export async function generar390Automatico(
  perfilId: string,
  anyo: number
): Promise<Resultado390Automatico | null> {
  const supabase = createClient()

  const desde = `${anyo}-01-01`
  const hasta = `${anyo + 1}-01-01`

  const { data: facturas } = await supabase
    .from('facturas')
    .select('*')
    .eq('perfilId', perfilId)
    .gte('fechaEmision', desde)
    .lt('fechaEmision', hasta)

  if (!facturas || facturas.length === 0) return null

  const arr = facturas as unknown as Factura[]
  const porTrimestre: FacturaFiscalMinima[][] = [[], [], [], []]
  for (const f of arr) {
    const mes = new Date(f.fechaEmision).getMonth()
    const tri = Math.min(3, Math.floor(mes / 3))
    porTrimestre[tri]?.push({
      tipo: f.tipo as 'ingreso' | 'gasto',
      importe: f.baseImponible,
      iva: f.iva,
      importeIva: f.iva > 0 ? Math.round(f.baseImponible * f.iva / 100) : 0,
      deducible: f.deducible,
    })
  }

  const resultados = resultadosIvaAnuales(porTrimestre)

  return {
    resultados,
    totalFacturas: arr.length,
    totalIngresos: arr.filter(f => f.tipo === 'ingreso').reduce((s, f) => s + f.baseImponible, 0),
    totalGastos: arr.filter(f => f.tipo === 'gasto').reduce((s, f) => s + f.baseImponible, 0),
  }
}
