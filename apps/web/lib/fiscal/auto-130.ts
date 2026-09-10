import { createClient } from '@/lib/supabase/client'

interface Factura {
  id: string
  tipo: string
  baseImponible: number
  iva: number
  total: number
  fechaEmision: string
  deducible: boolean | null
}

interface Nomina {
  salarioBruto: number
  irpf: number
  neto: number
}

export interface Resultado130Automatico {
  ingresos: number
  gastos: number
  rendimientoNeto: number
  retenciones: number
  cuotaIntegra: number
  totalFacturas: number
}

export async function generar130Automatico(
  perfilId: string,
  trimestre: 1 | 2 | 3 | 4,
  anyo: number
): Promise<Resultado130Automatico | null> {
  const supabase = createClient()

  const inicioMes = (trimestre - 1) * 3 + 1
  const finMes = inicioMes + 2

  const fechaInicio = `${anyo}-${String(inicioMes).padStart(2, '0')}-01`
  const ultimoDiaFinMes = new Date(anyo, finMes, 0).getDate()
  const fechaFin = `${anyo}-${String(finMes).padStart(2, '0')}-${String(ultimoDiaFinMes).padStart(2, '0')}`

  const [facturasRes, nominasRes] = await Promise.all([
    supabase
      .from('facturas')
      .select('*')
      .eq('perfilId', perfilId)
      .gte('fechaEmision', fechaInicio)
      .lte('fechaEmision', fechaFin),
    supabase
      .from('nominas')
      .select('salarioBruto, irpf, neto')
      .eq('perfilId', perfilId)
      .eq('rol', 'empleado')
      .eq('anyo', anyo),
  ])

  const facturas = (facturasRes.data ?? []) as unknown as Factura[]
  const nominas = (nominasRes.data ?? []) as unknown as Nomina[]

  const ingresos = facturas
    .filter(f => f.tipo === 'ingreso')
    .reduce((sum, f) => sum + f.baseImponible, 0)

  const gastos = facturas
    .filter(f => f.tipo === 'gasto' && (f.deducible === true || f.deducible === null))
    .reduce((sum, f) => sum + f.baseImponible, 0)

  const retenciones = nominas.reduce(
    (sum, n) => sum + Math.round(n.salarioBruto * (n.irpf / 100)),
    0
  )

  const rendimientoNeto = Math.max(0, ingresos - gastos)
  const cuotaIntegra = Math.round(rendimientoNeto * 0.20)

  if (facturas.length === 0 && nominas.length === 0) return null

  return {
    ingresos,
    gastos,
    rendimientoNeto,
    retenciones,
    cuotaIntegra,
    totalFacturas: facturas.length,
  }
}
