import { createClient } from '@/lib/supabase/client'

interface Factura {
  id: string
  tipo: string
  baseImponible: number
  iva: number
  total: number
  fechaEmision: string
  emisorReceptor: string
  deducible: boolean | null
}

export interface Resultado303Automatico {
  base21: number
  base10: number
  base4: number
  base0: number
  iva21: number
  iva10: number
  iva4: number
  ivaTotal: number
  baseSoportada21: number
  baseSoportada10: number
  baseSoportada4: number
  ivaSoportado: number
  totalFacturas: number
  totalIngresos: number
  totalGastos: number
}

export async function generar303Automatico(
  perfilId: string,
  trimestre: 1 | 2 | 3 | 4,
  anyo: number
): Promise<Resultado303Automatico | null> {
  const supabase = createClient()

  const inicioMes = (trimestre - 1) * 3 + 1
  const finMes = inicioMes + 2

  const fechaInicio = `${anyo}-${String(inicioMes).padStart(2, '0')}-01`
  const ultimoDiaFinMes = new Date(anyo, finMes, 0).getDate()
  const fechaFin = `${anyo}-${String(finMes).padStart(2, '0')}-${String(ultimoDiaFinMes).padStart(2, '0')}`

  const { data: facturas } = await supabase
    .from('facturas')
    .select('*')
    .eq('perfilId', perfilId)
    .gte('fechaEmision', fechaInicio)
    .lte('fechaEmision', fechaFin)

  if (!facturas || facturas.length === 0) return null

  const typedFacturas = facturas as unknown as Factura[]

  const ingresos = typedFacturas.filter(f => f.tipo === 'ingreso')
  const gastos = typedFacturas.filter(f => f.tipo === 'gasto' && (f.deducible === true || f.deducible === null))

  const base21 = ingresos.filter(f => f.iva === 21).reduce((sum, f) => sum + f.baseImponible, 0)
  const base10 = ingresos.filter(f => f.iva === 10).reduce((sum, f) => sum + f.baseImponible, 0)
  const base4 = ingresos.filter(f => f.iva === 4).reduce((sum, f) => sum + f.baseImponible, 0)
  const base0 = ingresos.filter(f => f.iva === 0).reduce((sum, f) => sum + f.baseImponible, 0)

  const iva21 = Math.round(base21 * 0.21)
  const iva10 = Math.round(base10 * 0.10)
  const iva4 = Math.round(base4 * 0.04)
  const ivaTotal = iva21 + iva10 + iva4

  const baseSoportada21 = gastos.filter(f => f.iva === 21).reduce((sum, f) => sum + f.baseImponible, 0)
  const baseSoportada10 = gastos.filter(f => f.iva === 10).reduce((sum, f) => sum + f.baseImponible, 0)
  const baseSoportada4 = gastos.filter(f => f.iva === 4).reduce((sum, f) => sum + f.baseImponible, 0)

  const ivaSoportado =
    Math.round(baseSoportada21 * 0.21) +
    Math.round(baseSoportada10 * 0.10) +
    Math.round(baseSoportada4 * 0.04)

  return {
    base21,
    base10,
    base4,
    base0,
    iva21,
    iva10,
    iva4,
    ivaTotal,
    baseSoportada21,
    baseSoportada10,
    baseSoportada4,
    ivaSoportado,
    totalFacturas: typedFacturas.length,
    totalIngresos: ingresos.reduce((sum, f) => sum + f.total, 0),
    totalGastos: gastos.reduce((sum, f) => sum + f.total, 0),
  }
}
