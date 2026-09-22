import { createClient } from '@/lib/supabase/client'

interface Factura {
  id: string
  tipo: string
  baseImponible: number
  iva: number
  total: number
  fechaEmision: string
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

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: perfil, error: perfilError } = await supabase
    .from('perfiles')
    .select('userId')
    .eq('id', perfilId)
    .single()

  if (perfilError || !perfil || perfil.userId !== user.id) return null

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

  if (facturasRes.error) {
    console.error('Error fetching facturas for modelo 130:', facturasRes.error)
    return null
  }
  if (nominasRes.error) {
    console.error('Error fetching nominas for modelo 130:', nominasRes.error)
    return null
  }

  const facturas = (facturasRes.data ?? []) as unknown as Factura[]
  const nominas = (nominasRes.data ?? []) as unknown as Nomina[]

  const ingresos = facturas
    .filter(f => f.tipo === 'ingreso')
    .reduce((sum, f) => sum + f.baseImponible, 0)

  const gastos = facturas
    .filter(f => f.tipo === 'gasto')
    .reduce((sum, f) => sum + f.baseImponible, 0)

  const retenciones = nominas.reduce(
    (sum, n) => sum + Math.round(n.salarioBruto * (n.irpf / 100)),
    0
  )

  const rendimientoNeto = Math.max(0, ingresos - gastos)
  const cuotaIntegra = Math.round(rendimientoNeto * 0.20)

  if (facturas.length === 0 && nominas.length === 0) return null

  return {
    ingresos: ingresos / 100,
    gastos: gastos / 100,
    rendimientoNeto,
    retenciones,
    cuotaIntegra,
    totalFacturas: facturas.length,
  }
}
