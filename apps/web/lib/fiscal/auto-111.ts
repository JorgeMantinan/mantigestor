import { createClient } from '@/lib/supabase/client'

interface NominaJefe {
  empleada: string
  salarioBruto: number
  irpf: number
  mes: number
}

interface NominaEmpleada {
  salarioBruto: number
  irpf: number
}

export interface Resultado111Automatico {
  trabajoBruto: number
  trabajoRetenciones: number
  profesionalBruto: number
  profesionalRetenciones: number
  totalRetenciones: number
  numEmpleados: number
}

export async function generar111Automatico(
  perfilId: string,
  trimestre: 1 | 2 | 3 | 4,
  anyo: number
): Promise<Resultado111Automatico | null> {
  const supabase = createClient()

  const inicioMes = (trimestre - 1) * 3 + 1
  const finMes = inicioMes + 2

  const fechaInicio = `${anyo}-${String(inicioMes).padStart(2, '0')}-01`
  const ultimoDiaFinMes = new Date(anyo, finMes, 0).getDate()
  const fechaFin = `${anyo}-${String(finMes).padStart(2, '0')}-${String(ultimoDiaFinMes).padStart(2, '0')}`

  const [nominasJefeRes, facturasRes] = await Promise.all([
    supabase
      .from('nominas')
      .select('empleada, salarioBruto, irpf, mes')
      .eq('perfilId', perfilId)
      .eq('rol', 'jefe')
      .eq('anyo', anyo),
    supabase
      .from('facturas')
      .select('emisorReceptor, baseImponible, mes')
      .eq('perfilId', perfilId)
      .eq('tipo', 'gasto')
      .gte('fechaEmision', fechaInicio)
      .lte('fechaEmision', fechaFin),
  ])

  const nominasJefe = (nominasJefeRes.data ?? []) as unknown as NominaJefe[]

  // Agrupar por empleado y filtrar por trimestre
  const porEmpleado = new Map<string, { bruto: number; retencion: number }>()
  for (const n of nominasJefe) {
    const trimestreNomina = Math.min(4, Math.ceil(n.mes / 3)) as 1 | 2 | 3 | 4
    if (trimestreNomina !== trimestre) continue
    const existing = porEmpleado.get(n.empleada) ?? { bruto: 0, retencion: 0 }
    existing.bruto += n.salarioBruto
    existing.retencion += Math.round(n.salarioBruto * (n.irpf / 100))
    porEmpleado.set(n.empleada, existing)
  }

  let trabajoBruto = 0
  let trabajoRetenciones = 0
  for (const datos of porEmpleado.values()) {
    trabajoBruto += datos.bruto
    trabajoRetenciones += datos.retencion
  }

  // Profesionales: facturas de gasto con retención IRPF 15%
  const facturas = (facturasRes.data ?? []) as unknown as Array<{
    emisorReceptor: string
    baseImponible: number
    mes?: number
  }>

  const porProfesional = new Map<string, number>()
  for (const f of facturas) {
    if (f.mes != null) {
      const trimestreFactura = Math.min(4, Math.ceil(f.mes / 3)) as 1 | 2 | 3 | 4
      if (trimestreFactura !== trimestre) continue
    }
    porProfesional.set(f.emisorReceptor, (porProfesional.get(f.emisorReceptor) ?? 0) + f.baseImponible)
  }

  let profesionalBruto = 0
  let profesionalRetenciones = 0
  const RETENCION_PROFESIONAL = 15
  for (const bruto of porProfesional.values()) {
    profesionalBruto += bruto
    profesionalRetenciones += Math.round(bruto * (RETENCION_PROFESIONAL / 100))
  }

  const totalRetenciones = trabajoRetenciones + profesionalRetenciones

  if (porEmpleado.size === 0 && porProfesional.size === 0) return null

  return {
    trabajoBruto,
    trabajoRetenciones,
    profesionalBruto,
    profesionalRetenciones,
    totalRetenciones,
    numEmpleados: porEmpleado.size,
  }
}
