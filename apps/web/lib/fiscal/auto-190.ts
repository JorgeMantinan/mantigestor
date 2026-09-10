import { createClient } from '@/lib/supabase/client'

interface Nomina {
  empleada: string
  salarioBruto: number
  irpf: number
  mes: number
  rol: string
}

interface Factura {
  emisorReceptor: string
  baseImponible: number
  tipo: string
  mes?: number
}

export interface Resultado190Automatico {
  trabajoBruto: number
  trabajoRetenciones: number
  profesionalBruto: number
  profesionalRetenciones: number
  totalBruto: number
  totalRetenciones: number
  numPagadores: number
}

export async function generar190Automatico(
  perfilId: string,
  anyo: number
): Promise<Resultado190Automatico | null> {
  const supabase = createClient()

  const desde = `${anyo}-01-01`
  const hasta = `${anyo + 1}-01-01`

  const [nominasRes, facturasRes] = await Promise.all([
    supabase
      .from('nominas')
      .select('empleada, salarioBruto, irpf, mes, rol')
      .eq('perfilId', perfilId)
      .eq('anyo', anyo),
    supabase
      .from('facturas')
      .select('emisorReceptor, baseImponible, tipo, mes')
      .eq('perfilId', perfilId)
      .eq('tipo', 'gasto')
      .gte('fechaEmision', desde)
      .lt('fechaEmision', hasta),
  ])

  const nominas = (nominasRes.data ?? []) as unknown as Nomina[]
  const facturas = (facturasRes.data ?? []) as unknown as Factura[]

  const porEmpleado = new Map<string, { bruto: number; retencion: number }>()
  for (const n of nominas) {
    if (n.rol !== 'jefe') continue
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

  const porProfesional = new Map<string, number>()
  for (const f of facturas) {
    porProfesional.set(f.emisorReceptor, (porProfesional.get(f.emisorReceptor) ?? 0) + f.baseImponible)
  }

  let profesionalBruto = 0
  let profesionalRetenciones = 0
  const RETENCION_PROFESIONAL = 15
  for (const bruto of porProfesional.values()) {
    profesionalBruto += bruto
    profesionalRetenciones += Math.round(bruto * (RETENCION_PROFESIONAL / 100))
  }

  const totalBruto = trabajoBruto + profesionalBruto
  const totalRetenciones = trabajoRetenciones + profesionalRetenciones
  const numPagadores = porEmpleado.size + porProfesional.size

  if (numPagadores === 0) return null

  return {
    trabajoBruto,
    trabajoRetenciones,
    profesionalBruto,
    profesionalRetenciones,
    totalBruto,
    totalRetenciones,
    numPagadores,
  }
}
