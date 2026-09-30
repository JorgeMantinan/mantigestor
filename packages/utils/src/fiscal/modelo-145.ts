/**
 * Modelo 145 — Comunicación de datos del perceptor (retenciones IRPF del trabajo).
 *
 * El trabajador comunica a su empresa su situación personal/familiar para que esta calcule
 * el porcentaje de retención de IRPF a aplicar en la nómina. Este módulo estima ese porcentaje.
 */

import { reduccionRendimientosTrabajoCents } from './reduccion-trabajo'

export interface DatosModelo145 {
  /** Salario bruto anual (€) */
  salarioBrutoAnual: number
  /** Número de pagadores en el ejercicio (1 si es tu único empleo) */
  numeroPagadores?: number
  /** Número de hijos que generan mínimo por descendientes */
  hijos?: number
  /** Grado de discapacidad % (0 si ninguno) */
  discapacidadPct?: number
  /** Gastos deducibles anuales del rendimiento del trabajo (€) */
  otrosGastos?: number
}

export interface ResultadoModelo145 {
  baseRetencion: number
  cuotaSS: number
  reduccionTrabajo: number
  minimoPersonal: number
  minimoDescendientes: number
  minimoDiscapacidad: number
  baseLiquidableRetencion: number
  cuotaRetencion: number
  tipoRetencionPct: number
  avisos: string[]
}

// Escala combinada estatal + autonómica (gnral CCAA) vigente 2026 (orientativa para retención).
// Tramos: 12.450 / 20.200 / 35.200 / 60.000 / 300.000
const TRAMOS_RETENCION: Array<{ desde: number; hasta: number | null; tipo: number }> = [
  { desde: 0, hasta: 12_450, tipo: 0.19 },
  { desde: 12_450, hasta: 20_200, tipo: 0.24 },
  { desde: 20_200, hasta: 35_200, tipo: 0.30 },
  { desde: 35_200, hasta: 60_000, tipo: 0.37 },
  { desde: 60_000, hasta: 300_000, tipo: 0.45 },
  { desde: 300_000, hasta: null, tipo: 0.47 },
]

const MINIMO_PERSONAL = 5_550
/** Mínimo por descendiente según posición: 1º 2.400€, 2º 2.700€, 3º 4.000€, 4º en adelante 4.500€ */
const MINIMOS_HIJO_POR_POSICION = [2_400, 2_700, 4_000, 4_500]
// Cuota SS del trabajador 2026: CC 4,70% + desempleo indefinido 1,55% + formación 0,10% + MEI 0,15% = 6,50%
const CUOTA_SS_EMPLEADO_PCT = 0.065

function cuotaPorEscala(baseEur: number): number {
  if (baseEur <= 0) return 0
  let cuota = 0
  for (const t of TRAMOS_RETENCION) {
    if (baseEur <= t.desde) break
    const baseTramo = (t.hasta === null ? baseEur : Math.min(t.hasta, baseEur)) - t.desde
    cuota += baseTramo * t.tipo
  }
  return cuota
}

export function calcularModelo145(datos: DatosModelo145): ResultadoModelo145 {
  const avisos: string[] = []

  const bruto = Math.max(0, datos.salarioBrutoAnual)
  const pagadores = datos.numeroPagadores ?? 1
  const hijos = datos.hijos ?? 0

  // Cuota de Seguridad Social del trabajador (6,50% del bruto: CC + desempleo + formación + MEI)
  const cuotaSS = bruto * CUOTA_SS_EMPLEADO_PCT

  // Rendimiento neto previo (antes de reducción)
  const rendimientoNetoPrev = bruto - cuotaSS - (datos.otrosGastos ?? 0)

  // Reducción por obtención de rendimientos del trabajo (art. 20 LIRPF)
  const reduccionTrabajo = Math.max(
    0,
    reduccionRendimientosTrabajoCents(Math.round(rendimientoNetoPrev * 100)) / 100
  )

  // Mínimos: personal + descendientes (según posición) + discapacidad
  const minimoPersonal = MINIMO_PERSONAL
  let minimoDescendientes = 0
  for (let i = 0; i < hijos; i++) {
    minimoDescendientes += MINIMOS_HIJO_POR_POSICION[Math.min(i, MINIMOS_HIJO_POR_POSICION.length - 1)] ?? 0
  }
  const discapacidadPct = datos.discapacidadPct ?? 0
  const minimoDiscapacidad = discapacidadPct >= 65 ? 9_000 : discapacidadPct >= 33 ? 3_000 : 0
  const minimoTotales = minimoPersonal + minimoDescendientes + minimoDiscapacidad

  // Base liquidable a efectos de retención
  const baseLiquidableRetencion = Math.max(0, rendimientoNetoPrev - reduccionTrabajo - minimoTotales)

  // Cuota sobre la escala (todo el ejercicio)
  const cuotaAnual = cuotaPorEscala(baseLiquidableRetencion)

  // Tipo medio de retención sobre el rendimiento (no el bruto)
  const baseRetencion = Math.max(0, rendimientoNetoPrev)
  const tipoRetencionPct =
    baseRetencion === 0 ? 0 : Number(((cuotaAnual / baseRetencion) * 100).toFixed(2))

  const cuotaRetencion = bruto * (tipoRetencionPct / 100)

  if (pagadores >= 2) {
    avisos.push('Con dos o más pagadores se aplica la retención mínima de seguridad: el resultado puede variar en la declaración.')
  }
  if (cuotaAnual <= 0) {
    avisos.push('Con este rendimiento la cuota es cero o negativa: el empleado no retendría (retención 0%).')
  }

  return {
    baseRetencion,
    cuotaSS,
    reduccionTrabajo,
    minimoPersonal,
    minimoDescendientes,
    minimoDiscapacidad,
    baseLiquidableRetencion,
    cuotaRetencion,
    tipoRetencionPct,
    avisos,
  }
}
