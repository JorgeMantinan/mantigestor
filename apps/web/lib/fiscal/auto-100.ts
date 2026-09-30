import { createClient } from '@/lib/supabase/client'
import {
  calcularModelo100,
  reduccionRendimientosTrabajoCents,
  MINIMO_CONTRIBUYENTE,
  MINIMO_ASCENDIENTE_65,
  MINIMO_ASCENDIENTE_75,
  MINIMO_DESCENDIENTE_MENOR_3,
  MINIMOS_DESCENDIENTE_POR_POSICION,
  MINIMO_DISCAPACIDAD_GRAVE,
  MINIMO_DISCAPACIDAD_GRAVE_GRAVE,
  type DatosModelo100,
  type ResultadoModelo100,
} from '@mantigestor/utils'

interface Perfil {
  id: string
  nombre: string | null
  nif: string | null
  situacionCivil: string | null
  fechaNacimiento: string | null
  numeroHijos: number
  hijosEdades: string | null
  tieneDiscapacidad: boolean
  porcentajeDiscapacidad: number
  familiaNumerosa: boolean
  planPensiones: number
  segurosDependencia: number
  donaciones: number
}

interface Factura {
  id: string
  tipo: string
  baseImponible: number
  iva: number
  fechaEmision: string
  deducible?: boolean | null
}

interface Nomina {
  id: string
  salarioBruto: number
  irpf: number
  seguridadSocial: number
  rol: string
}

interface PropiedadAlquiler {
  id: string
  ingresos: number
  gastos_alquiler: Array<{ importe: number }>
}

export interface Resultado100Automatico {
  perfil: Perfil | null
  anyo: number
  rendimientosTrabajo: number
  rendimientosActividades: number
  rendimientosAlquiler: number
  baseImponibleGeneral: number
  reduccionTrabajo: number
  baseLiquidableGeneral: number
  minimoPersonalFamiliar: number
  retencionesIRPF: number
  pagosFraccionados: number
  planPensiones: number
  segurosDependencia: number
  donaciones: number
  situacionCivil: string
  fechaNacimiento: string | null
  numeroHijos: number
  hijosEdades: number[]
  tieneDiscapacidad: boolean
  porcentajeDiscapacidad: number
  familiaNumerosa: boolean
  resultado: ResultadoModelo100
}

export async function generar100Automatico(
  perfilId: string,
  anyo: number
): Promise<Resultado100Automatico | null> {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // 1. Get profile data + verify ownership
  const { data: perfil, error: perfilError } = await supabase
    .from('perfiles')
    .select('*')
    .eq('id', perfilId)
    .single()

  if (perfilError || !perfil || (perfil as unknown as { userId: string }).userId !== user.id) return null

  // 2. Get all invoices for the year
  const { data: facturas, error: facturasError } = await supabase
    .from('facturas')
    .select('*')
    .eq('perfilId', perfilId)
    .gte('fechaEmision', `${anyo}-01-01`)
    .lte('fechaEmision', `${anyo}-12-31`)

  if (facturasError) {
    console.error('Error fetching facturas for modelo 100:', facturasError)
    return null
  }

  // 3. Get payroll data
  const { data: nominas, error: nominasError } = await supabase
    .from('nominas')
    .select('*')
    .eq('perfilId', perfilId)
    .eq('anyo', anyo)

  if (nominasError) {
    console.error('Error fetching nominas for modelo 100:', nominasError)
    return null
  }

  // 4. Get rental income/expenses
  const { data: propiedades, error: propiedadesError } = await supabase
    .from('propiedades_alquiler')
    .select('*, gastos_alquiler(*)')
    .eq('perfilId', perfilId) as { data: PropiedadAlquiler[] | null; error: unknown }

  if (propiedadesError) {
    console.error('Error fetching propiedades for modelo 100:', propiedadesError)
    return null
  }

  const p = perfil as unknown as Perfil | null

  // 5. Calculate rendimientos del trabajo
  const nominasArr = (nominas ?? []) as unknown as Nomina[]
  const ingresosTrabajo = nominasArr
    .filter(n => n.rol === 'empleado')
    .reduce((sum, n) => sum + n.salarioBruto, 0)
  const gastosDeduciblesTrabajo = nominasArr
    .filter(n => n.rol === 'empleado')
    .reduce((sum, n) => sum + (n.seguridadSocial ?? 0), 0)

  const retencionesIRPF = nominasArr
    .filter(n => n.rol === 'empleado')
    .reduce((sum, n) => sum + Math.round(n.salarioBruto * (n.irpf / 100)), 0)

  const rendimientosTrabajo = Math.max(0, ingresosTrabajo - gastosDeduciblesTrabajo)

  // 6. Calculate rendimientos de actividades económicas
  const facturasArr = (facturas ?? []) as unknown as Factura[]
  const ingresosActividades = facturasArr
    .filter(f => f.tipo === 'ingreso')
    .reduce((sum, f) => sum + f.baseImponible, 0)
  const gastosActividades = facturasArr
    .filter(f => f.deducible !== false)
    .reduce((sum, f) => sum + f.baseImponible, 0)

  const rendimientosActividades = Math.max(0, ingresosActividades - gastosActividades)

  // 7. Calculate rental income
  const ingresosAlquiler = (propiedades ?? [])
    .reduce((sum, p) => sum + (p.ingresos ?? 0), 0)
  const gastosAlquiler = (propiedades ?? [])
    .reduce((sum, p) =>
      sum + (p.gastos_alquiler?.reduce((g, ga) => g + (ga.importe ?? 0), 0) ?? 0), 0)

  const rendimientosAlquiler = ingresosAlquiler - gastosAlquiler

  // 8. Base imponible general
  const baseImponibleGeneral = rendimientosTrabajo + rendimientosActividades + Math.max(0, rendimientosAlquiler)

  // 9. Calculate reductions
  const reduccionTrabajo = reduccionRendimientosTrabajoCents(rendimientosTrabajo)

  // 10. Calculate minimum personal y familiar
  const fechaFinAnyo = new Date(anyo, 11, 31) // 31 de diciembre del año fiscal
  const edad = p?.fechaNacimiento
    ? Math.floor((fechaFinAnyo.getTime() - new Date(p.fechaNacimiento).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
    : 0

  const hijosEdades: number[] = (() => {
    try {
      return p?.hijosEdades ? JSON.parse(p.hijosEdades) : []
    } catch {
      return []
    }
  })()

  // Mínimo personal y familiar (art. 56-60 LIRPF, cuantías 2025/2026)
  let minimoPersonal = MINIMO_CONTRIBUYENTE
  if (edad >= 65) minimoPersonal += MINIMO_ASCENDIENTE_65 // 1.150€ (art. 57.2)
  if (edad >= 75) minimoPersonal += MINIMO_ASCENDIENTE_75 // +1.400€ adicionales (art. 57.2)

  // Mínimo por descendientes (art. 58: menores de 25 años que conviven): 2.400/2.700/4.000/4.500€
  // según posición + 2.800€ adicional si tienen menos de 3 años
  const hijosMinimo = hijosEdades.filter(edadHijo => edadHijo < 25)
  let minimoFamiliar = 0
  hijosMinimo.forEach((_edadHijo, i) => {
    minimoFamiliar += MINIMOS_DESCENDIENTE_POR_POSICION[Math.min(i, MINIMOS_DESCENDIENTE_POR_POSICION.length - 1)] ?? 0
  })
  for (const edadHijo of hijosMinimo) {
    if (edadHijo < 3) minimoFamiliar += MINIMO_DESCENDIENTE_MENOR_3
  }

  if (p?.tieneDiscapacidad) {
    if ((p.porcentajeDiscapacidad ?? 0) >= 65) minimoPersonal += MINIMO_DISCAPACIDAD_GRAVE_GRAVE // 9.000€
    else if ((p.porcentajeDiscapacidad ?? 0) >= 33) minimoPersonal += MINIMO_DISCAPACIDAD_GRAVE // 3.000€
  }

  const minimoPersonalFamiliar = minimoPersonal + minimoFamiliar

  // 11. Calculate reductions for plan de pensiones + seguros dependencia
  const reduccionBase = (p?.planPensiones ?? 0) + (p?.segurosDependencia ?? 0)

  // 12. Calculate using Modelo 100
  const datos: DatosModelo100 = {
    baseImponibleGeneral,
    baseImponibleAhorro: 0,
    reduccionTrabajo: Math.min(reduccionTrabajo + reduccionBase, baseImponibleGeneral),
    reduccionAhorro: 0,
    minimoPersonalFamiliar,
    deduccionesAutonomicas: 0,
    pagosFraccionados: retencionesIRPF,
    retenciones: retencionesIRPF,
    dividendosIRPF: 0,
    rendimientosIntegrosTrabajo: ingresosTrabajo,
    ejercicio: anyo,
  }

  const resultado = calcularModelo100(datos)

  return {
    perfil: p,
    anyo,
    rendimientosTrabajo,
    rendimientosActividades,
    rendimientosAlquiler,
    baseImponibleGeneral,
    reduccionTrabajo: Math.min(reduccionTrabajo, baseImponibleGeneral),
    baseLiquidableGeneral: resultado.baseImponibleGeneral,
    minimoPersonalFamiliar,
    retencionesIRPF,
    pagosFraccionados: retencionesIRPF,
    planPensiones: p?.planPensiones ?? 0,
    segurosDependencia: p?.segurosDependencia ?? 0,
    donaciones: p?.donaciones ?? 0,
    situacionCivil: p?.situacionCivil ?? 'soltero',
    fechaNacimiento: p?.fechaNacimiento ?? null,
    numeroHijos: p?.numeroHijos ?? 0,
    hijosEdades,
    tieneDiscapacidad: p?.tieneDiscapacidad ?? false,
    porcentajeDiscapacidad: p?.porcentajeDiscapacidad ?? 0,
    familiaNumerosa: p?.familiaNumerosa ?? false,
    resultado,
  }
}
