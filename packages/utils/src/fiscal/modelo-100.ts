/**
 * Modelo 100 — Declaración de la Renta (IRPF anual)
 *
 * Escalas estatales 2026: base general 19/24/30/37/45/47 y ahorro 19/21/23/27/30,
 * mínimo personal y familiar (art. 56 LIRPF) minorando la cuota íntegra,
 * reducción art. 20 LIRPF y deducción DA 61ª (Ley 5/2025 / RDL 5/2026).
 *
 * Fuentes: LIRPF, RIRPF, Manual Renta AEAT 2025, cuadros AEAT de tipos 2026.
 */

import {
  deduccionTrabajoCents,
  DEDUCCION_TRABAJO_2025,
  DEDUCCION_TRABAJO_2026,
  reduccionRendimientosTrabajoCents,
} from './reduccion-trabajo'

/**
 * Mínimo personal y familiar del Modelo 100 (art. 56 LIRPF).
 * Incluye mínimo por contribuyente + descendientes + ascendientes + discapacidad.
 * Cuantías oficiales 2025/2026 (Manual Renta AEAT, CSV mínimos).
 */
export interface MinimoPersonalFamiliar {
  contribuyente: number     // 5.550€ siempre
  ascendientes65: number    // 1.150€ por cada ascendiente ≥65
  ascendientes75: number    // 1.400€ adicional por cada ascendiente ≥75
  descendientes: number     // 2.400/2.700/4.000/4.500€ por posición (1º-4º+) + 2.800€ si <3
  descendientesDiscapacidad: number // 3.000€ o 9.000€ por descendiente discapacitado
  ascendientesDiscapacidad: number  // 3.000€ o 9.000€ por ascendiente discapacitado
  discapacidadContribuyente: number // 3.000€ o 9.000€
}

export const MINIMO_CONTRIBUYENTE = 555_000 // 5.550€
export const MINIMO_ASCENDIENTE_65 = 115_000 // 1.150€
export const MINIMO_ASCENDIENTE_75 = 140_000 // 1.400€ adicional
export const MINIMO_DESCENDIENTE = 240_000 // 2.400€ (1er descendiente)
export const MINIMO_DESCENDIENTE_MENOR_3 = 280_000 // +2.800€ si <3 años
/** Mínimo por descendiente según posición: 1º 2.400€, 2º 2.700€, 3º 4.000€, 4º en adelante 4.500€ */
export const MINIMOS_DESCENDIENTE_POR_POSICION = [240_000, 270_000, 400_000, 450_000]
export const MINIMO_DISCAPACIDAD_GRAVE = 300_000 // 3.000€ (≥33%)
export const MINIMO_DISCAPACIDAD_GRAVE_GRAVE = 900_000 // 9.000€ (≥65%)

export function calcularMinimoPersonalFamiliar(params: {
  numAscendientes65?: number
  numAscendientes75?: number
  numDescendientesMenores3?: number
  numDescendientes3_65?: number
  numDescendientesDiscapacidad?: number
  gradoDiscapacidadDescendiente?: 'leve' | 'grave' | 'grave_grave'
  numAscendientesDiscapacidad?: number
  gradoDiscapacidadAscendiente?: 'leve' | 'grave' | 'grave_grave'
  contribuyenteDiscapacidad?: boolean
  gradoDiscapacidadContribuyente?: 'leve' | 'grave' | 'grave_grave'
}): MinimoPersonalFamiliar {
  const minimoDiscapacidad = (grado: 'leve' | 'grave' | 'grave_grave' | undefined) => {
    if (grado === 'grave_grave') return MINIMO_DISCAPACIDAD_GRAVE_GRAVE
    if (grado === 'grave') return MINIMO_DISCAPACIDAD_GRAVE
    return 0
  }

  const menores3 = params.numDescendientesMenores3 ?? 0
  const numDescendientes = menores3 + (params.numDescendientes3_65 ?? 0)
  let minimoDescendientes = 0
  for (let i = 0; i < numDescendientes; i++) {
    minimoDescendientes += MINIMOS_DESCENDIENTE_POR_POSICION[Math.min(i, MINIMOS_DESCENDIENTE_POR_POSICION.length - 1)] ?? 0
  }
  minimoDescendientes += menores3 * MINIMO_DESCENDIENTE_MENOR_3

  return {
    contribuyente: MINIMO_CONTRIBUYENTE,
    ascendientes65: (params.numAscendientes65 ?? 0) * MINIMO_ASCENDIENTE_65,
    ascendientes75: (params.numAscendientes75 ?? 0) * MINIMO_ASCENDIENTE_75,
    descendientes: minimoDescendientes,
    descendientesDiscapacidad: (params.numDescendientesDiscapacidad ?? 0) * minimoDiscapacidad(params.gradoDiscapacidadDescendiente),
    ascendientesDiscapacidad: (params.numAscendientesDiscapacidad ?? 0) * minimoDiscapacidad(params.gradoDiscapacidadAscendiente),
    discapacidadContribuyente: params.contribuyenteDiscapacidad ? minimoDiscapacidad(params.gradoDiscapacidadContribuyente) : 0,
  }
}

export function totalMinimoPersonalFamiliar(m: MinimoPersonalFamiliar): number {
  return m.contribuyente + m.ascendientes65 + m.ascendientes75 + m.descendientes +
    m.descendientesDiscapacidad + m.ascendientesDiscapacidad + m.discapacidadContribuyente
}

/**
 * Reducción art. 20 LIRPF por rendimientos del trabajo (delega en
 * la implementación compartida de reduccion-trabajo.ts, valores 2025/2026).
 */
export function reduccionTrabajo20(rendimientosTrabajoCents: number): number {
  return reduccionRendimientosTrabajoCents(Math.max(0, Math.round(rendimientosTrabajoCents)))
}

export interface DatosModelo100 {
  /** Escala estatal de la base general (tramos en €: { desde, hasta, tipo }); si se
   *  indica, se aplica en lugar de la escala de referencia estatal */
  escalaEstatal?: Array<{ desde: number; hasta: number | null; tipo: number }>
  /** Escala autonómica de la comunidad (tramos en €): se SUMA a la estatal.
   *  En régimen foral se pasa solo esta (tarifa íntegra del territorio). */
  escalaAutonomica?: Array<{ desde: number; hasta: number | null; tipo: number }> | null
  /** Rendimiento neto general previo a reducciones (céntimos) */
  baseImponibleGeneral: number
  /** Rendimientos del ahorro: dividendos, intereses, plusvalías (céntimos) */
  baseImponibleAhorro: number
  /** Reducción art. 20 LIRPF ya calculada por el usuario (céntimos) */
  reduccionTrabajo: number
  /** Reducción del ahorro aplicable (cánones y otros, art. 25.2 LIRPF) */
  reduccionAhorro: number
  /** Mínimo personal y familiar (céntimos) */
  minimoPersonalFamiliar: number
  /** Deducciones autonómicas aplicadas (céntimos) */
  deduccionesAutonomicas: number
  /** Pagos fraccionados del año (130/131) y retenciones (111/112/115/117) (céntimos) */
  pagosFraccionados: number
  /** Retenciones soportadas (nóminas, facturas con retención) (céntimos) */
  retenciones: number
  /** Rendimientos íntegros de capital mobiliario sujetos a retención (para DA 61ª) */
  dividendosIRPF: number
  /** Rendimientos íntegros del trabajo (salario bruto) — si se conoce, se usa para la DA 61ª */
  rendimientosIntegrosTrabajo?: number
  /** Ejercicio fiscal del cálculo (default 2026) */
  ejercicio?: number
}

export interface ResultadoModelo100 {
  /** Base liquidable general tras reducciones */
  baseImponibleGeneral: number
  /** Base liquidable del ahorro tras reducciones */
  baseImponibleAhorro: number
  /** Cuota íntegra estatal + autonómica (parte general) */
  cuotaIntegra: number
  /** Cuota íntegra del ahorro */
  cuotaAhorro: number
  /** Cuota íntegra total antes de deducciones */
  totalCuota: number
  /** Deducciones: DA 61ª + autonómicas */
  deducciones: number
  /** Cuota líquida anual */
  cuotaLiquida: number
  /** Amount to pay (positive) or refund (negative) */
  aPagar: number
  aDevolver: number
}

/** Escala estatal IRPF 2025/2026 — tramos de la base general (tipo total estatal + autonómico) */
const ESCALA_GENERAL_TRAMOS: Array<{ desde: number; hasta: number | null; tipo: number }> = [
  { desde: 0, hasta: 12_450, tipo: 19 },
  { desde: 12_450, hasta: 20_200, tipo: 24 },
  { desde: 20_200, hasta: 35_200, tipo: 30 },
  { desde: 35_200, hasta: 60_000, tipo: 37 },
  { desde: 60_000, hasta: 300_000, tipo: 45 },
  { desde: 300_000, hasta: null, tipo: 47 },
]

/** Escala IRPF 2025/2026 — base del ahorro (art. 63 LIRPF, tipo total estatal + autonómico) */
const ESCALA_AHORRO_TRAMOS: Array<{ desde: number; hasta: number | null; tipo: number }> = [
  { desde: 0, hasta: 6_000, tipo: 19 },
  { desde: 6_000, hasta: 50_000, tipo: 21 },
  { desde: 50_000, hasta: 200_000, tipo: 23 },
  { desde: 200_000, hasta: 300_000, tipo: 27 },
  { desde: 300_000, hasta: null, tipo: 30 },
]

function calcularCuotaEscalas(baseEur: number, tramos: Array<{ desde: number; hasta: number | null; tipo: number }>): number {
  let cuota = 0
  for (const t of tramos) {
    if (baseEur <= t.desde) break
    const limiteSuperior = t.hasta === null ? baseEur : Math.min(t.hasta, baseEur)
    const baseTramo = limiteSuperior - t.desde
    cuota += Math.round(baseTramo * (t.tipo / 100) * 100) // céntimos
  }
  return cuota
}

/**
 * Deducción DA 61ª LIRPF por rendimientos del trabajo (reduce cuota íntegra):
 * - 2025 (Ley 5/2025): 340€ si rentas ≤ 16.576€, a 0 a partir de 18.276€
 * - 2026 (RDL 5/2026): 590,89€ si rentas ≤ 17.094€, a 0 a partir de 20.048,45€
 * Límite: no puede exceder la cuota íntegra.
 */
function deduccionDA61a(cuotaIntegraCents: number, rendimientosIntegrosCents: number, ejercicio: number): number {
  if (ejercicio < 2025) return 0 // la deducción existe desde el ejercicio 2025
  if (rendimientosIntegrosCents <= 0) return 0
  const params = ejercicio <= 2025 ? DEDUCCION_TRABAJO_2025 : DEDUCCION_TRABAJO_2026
  return deduccionTrabajoCents(rendimientosIntegrosCents, params, cuotaIntegraCents)
}

export function calcularModelo100(datos: DatosModelo100): ResultadoModelo100 {
  const ejercicio = datos.ejercicio ?? 2026
  const baseGeneral = Math.max(0, datos.baseImponibleGeneral - datos.reduccionTrabajo)
  const baseAhorro = Math.max(0, datos.baseImponibleAhorro - datos.reduccionAhorro)

  // Cuota íntegra general: escala aplicada a la base liquidable general
  const usaEscalasTerritorio = Boolean(datos.escalaEstatal || datos.escalaAutonomica)
  const minimo = Math.max(0, datos.minimoPersonalFamiliar)
  let cuotaIntegra: number
  if (usaEscalasTerritorio) {
    // Escala real: parte estatal + parte autonómica (o tarifa foral íntegra),
    // minoradas cada una por el mínimo personal/familiar (art. 62 LIRPF).
    cuotaIntegra = 0
    if (datos.escalaEstatal) {
      cuotaIntegra += calcularCuotaEscalas(baseGeneral / 100, datos.escalaEstatal)
      cuotaIntegra = Math.max(0, cuotaIntegra - calcularCuotaEscalas(minimo / 100, datos.escalaEstatal))
    }
    if (datos.escalaAutonomica) {
      cuotaIntegra += calcularCuotaEscalas(baseGeneral / 100, datos.escalaAutonomica)
      cuotaIntegra = Math.max(0, cuotaIntegra - calcularCuotaEscalas(minimo / 100, datos.escalaAutonomica))
    }
  } else {
    // Escala de referencia (tipo total estatal + autonómico) usada como aproximación
    cuotaIntegra = calcularCuotaEscalas(baseGeneral / 100, ESCALA_GENERAL_TRAMOS)
    // El mínimo personal y familiar minora la cuota íntegra: escala(base) − escala(mínimo)
    // (art. 62 LIRPF). Nunca puede resultar negativa.
    cuotaIntegra = Math.max(0, cuotaIntegra - calcularCuotaEscalas(minimo / 100, ESCALA_GENERAL_TRAMOS))
  }
  // Remanente del mínimo no aplicado por insuficiencia de la base general:
  // minora la cuota del ahorro (art. 63.1 LIRPF)
  const remanenteMinimo = Math.max(0, minimo - baseGeneral)
  let cuotaAhorro = calcularCuotaEscalas(baseAhorro / 100, ESCALA_AHORRO_TRAMOS)
  if (remanenteMinimo > 0 && cuotaAhorro > 0) {
    const minoracion = calcularCuotaEscalas(Math.min(remanenteMinimo, baseAhorro) / 100, ESCALA_AHORRO_TRAMOS)
    cuotaAhorro = Math.max(0, cuotaAhorro - Math.min(cuotaAhorro, minoracion))
  }

  const totalCuota = cuotaIntegra + cuotaAhorro

  // Deducción DA 61ª — se excluyen dividendos (rentas del ahorro) de la base para esta deducción
  const baseDA61a = datos.rendimientosIntegrosTrabajo !== undefined
    ? Math.max(0, datos.rendimientosIntegrosTrabajo)
    : Math.max(0, datos.baseImponibleGeneral - datos.dividendosIRPF)
  const da61a = deduccionDA61a(cuotaIntegra, baseDA61a, ejercicio)
  const deducciones = da61a + datos.deduccionesAutonomicas

  const cuotaLiquida = Math.max(0, totalCuota - deducciones)
  const totalPagos = datos.pagosFraccionados + datos.retenciones

  const diferencia = cuotaLiquida - totalPagos

  return {
    baseImponibleGeneral: baseGeneral,
    baseImponibleAhorro: baseAhorro,
    cuotaIntegra,
    cuotaAhorro,
    totalCuota,
    deducciones,
    cuotaLiquida,
    aPagar: Math.max(0, diferencia),
    aDevolver: Math.max(0, -diferencia),
  }
}
