import { createClient } from '@/lib/supabase/client'
import { computeIntracomunitarias } from './datos-reales'
import { calcularModelo349, type OperacionIntracomunitaria } from '@mantigestor/utils'

export interface Resultado349Automatico {
  operaciones: OperacionIntracomunitaria[]
  totalEntregas: number
  totalAdquisiciones: number
  numOperaciones: number
}

export async function generar349Automatico(
  perfilId: string,
  anyo: number
): Promise<Resultado349Automatico | null> {
  const supabase = createClient()

  const desde = `${anyo}-01-01`
  const hasta = `${anyo + 1}-01-01`

  const { data: facturas } = await supabase
    .from('facturas')
    .select('emisorReceptor, nifContraparte, baseImponible, tipo')
    .eq('perfilId', perfilId)
    .gte('fechaEmision', desde)
    .lt('fechaEmision', hasta)

  if (!facturas || facturas.length === 0) return null

  const typedFacturas = facturas as unknown as Array<{
    emisorReceptor: string
    nifContraparte: string | null
    baseImponible: number
    tipo: string
  }>

  const ingresos = typedFacturas.filter(f => f.tipo === 'ingreso')
  const gastos = typedFacturas.filter(f => f.tipo === 'gasto')

  const raw = computeIntracomunitarias(ingresos, gastos)

  if (raw.length === 0) return null

  const operaciones: OperacionIntracomunitaria[] = raw.map(op => ({
    tercero: op.tercero,
    nif: op.nif,
    pais: op.pais,
    tipo: op.tipo as OperacionIntracomunitaria['tipo'],
    baseImponible: op.baseImponible,
  }))

  if (operaciones.length === 0) return null

  const resultado = calcularModelo349({ operaciones, periodo: 'trimestral' })

  return {
    operaciones,
    totalEntregas: resultado.totalEntregas,
    totalAdquisiciones: resultado.totalAdquisiciones,
    numOperaciones: resultado.numOperaciones,
  }
}
