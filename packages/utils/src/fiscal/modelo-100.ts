/**
 * Modelo 100 — Declaración de la Renta (IRPF anual)
 *
 * Escalas estatales 2025/2026, deducción DA 61ª (Ley 5/2025),
 * reducción art. 20 LIRPF por rendimientos del trabajo.
 *
 * Fuentes: LIRPF, RIRPF, Manual Renta AEAT 2025.
 */

/**
 * Mínimo personal y familiar del Modelo 100 (art. 56 LIRPF).
 * Incluye mínimo por contribuyente + descendientes + ascendientes + discapacidad.
 */
export interface MinimoPersonalFamiliar {
  contribuyente: number     // 5.550€ siempre
  ascendientes65: number    // 1.150€ por cada ascendiente ≥65
  descendientesMenores3: number  // 2.800€ por descendiente <3
  descendientes3_65: number // 2.800€ por descendiente 3-65
  descendientesDiscapacidad: number // 3.000€ o 6.000€ por descendiente discapacitado
  ascendientesDiscapacidad: number  // 3.000€ o 6.000€ por ascendiente discapacitado
  discapacidadContribuyente: number // 3.000€ o 6.000€
}

export const MINIMO_CONTRIBUYENTE = 555_00 // 5.550€
export const MINIMO_ASCENDIENTE_65 = 115_00 // 1.150€
export const MINIMO_DESCENDIENTE_MENOR_3 = 280_00 // 2.800€
export const MINIMO_DESCENDIENTE_3_65 = 280_00 // 2.800€
export const MINIMO_DISCAPACIDAD_GRAVE = 300_00 // 3.000°
export const MINIMO_DISCAPACIDAD_GRAVE_GRAVE = 600_00 // 6.000°

export function calcularMinimoPersonalFamiliar(params: {
  numAscendientes65?: number
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

  return {
    contribuyente: MINIMO_CONTRIBUYENTE,
    ascendientes65: (params.numAscendientes65 ?? 0) * MINIMO_ASCENDIENTE_65,
    descendientesMenores3: (params.numDescendientesMenores3 ?? 0) * MINIMO_DESCENDIENTE_MENOR_3,
    descendientes3_65: (params.numDescendientes3_65 ?? 0) * MINIMO_DESCENDIENTE_3_65,
    descendientesDiscapacidad: (params.numDescendientesDiscapacidad ?? 0) * minimoDiscapacidad(params.gradoDiscapacidadDescendiente),
    ascendientesDiscapacidad: (params.numAscendientesDiscapacidad ?? 0) * minimoDiscapacidad(params.gradoDiscapacidadAscendiente),
    discapacidadContribuyente: params.contribuyenteDiscapacidad ? minimoDiscapacidad(params.gradoDiscapacidadContribuyente) : 0,
  }
}

export function totalMinimoPersonalFamiliar(m: MinimoPersonalFamiliar): number {
  return m.contribuyente + m.ascendientes65 + m.descendientesMenores3 + m.descendientes3_65 +
    m.descendientesDiscapacidad + m.ascendientesDiscapacidad + m.discapacidadContribuyente
}

/**
 * Reducción art. 20 LIRPF por rendimientos del trabajo:
 * - Rendimientos ≤ 14.047,50€: reducción 6.498€
 * - 14.047,50 - 19.747,50€: reducción progresiva
 * - ≥ 19.747,50€: sin reducción
 */
export function reduccionTrabajo20(rendimientosTrabajoCents: number): number {
  const r = rendimientosTrabajoCents
  if (r <= 1_404_750) return 649_800 // 6.498€
  if (r >= 1_974_750) return 0
  const exceso = r - 1_404_750
  const rango = 1_974_750 - 1_404_750
  const reduccion = 649_800 - Math.round((exceso / rango) * 649_800)
  return Math.max(0, reduccion)
}

export interface DatosModelo100 {
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

/** Escala estatal IRPF 2025/2026 — tramos de la base general */
const ESCALA_GENERAL_TRAMOS: Array<{ desde: number; hasta: number | null; tipo: number }> = [
  { desde: 0, hasta: 12_450, tipo: 19 },
  { desde: 12_450, hasta: 20_200, tipo: 21 },
  { desde: 20_200, hasta: 35_200, tipo: 23 },
  { desde: 35_200, hasta: 60_000, tipo: 25 },
  { desde: 60_000, hasta: 300_000, tipo: 27 },
  { desde: 300_000, hasta: null, tipo: 30 },
]

/** Escala estatal IRPF — base del ahorro (art. 63 LIRPF) */
const ESCALA_AHORRO_TRAMOS: Array<{ desde: number; hasta: number | null; tipo: number }> = [
  { desde: 0, hasta: 6_000, tipo: 19 },
  { desde: 6_000, hasta: 50_000, tipo: 21 },
  { desde: 50_000, hasta: 200_000, tipo: 23 },
  { desde: 200_000, hasta: 300_000, tipo: 27 },
  { desde: 300_000, hasta: null, tipo: 37 },
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
 * Deducción DA 61ª LIRPF (Ley 5/2025):
 * - Base 340€ si rentas ≤ 15.000€
 * - Reducción progresiva hasta 16.000€
 * - Aplica a la cuota íntegra
 */
function deduccionDA61a(cuotaIntegraCents: number, baseImponibleCents: number): number {
  const base = 34_000 // 340€ en céntimos
  const umbral = 1_500_000 // 15.000€
  const tope = 1_600_000 // 16.000€

  if (baseImponibleCents <= umbral) return Math.min(base, cuotaIntegraCents)

  if (baseImponibleCents >= tope) return 0

  const excesoEur = (baseImponibleCents - umbral) / 100
  const deduccion = Math.max(0, Math.round(base - Math.round(excesoEur * 34 * 100) / 100))
  return Math.min(deduccion, cuotaIntegraCents)
}

export function calcularModelo100(datos: DatosModelo100): ResultadoModelo100 {
  const baseGeneral = Math.max(0, datos.baseImponibleGeneral - datos.reduccionTrabajo)
  const baseAhorro = Math.max(0, datos.baseImponibleAhorro - datos.reduccionAhorro)

  // Cuota íntegra general (estatal)
  const cuotaIntegra = calcularCuotaEscalas(baseGeneral / 100, ESCALA_GENERAL_TRAMOS)
  // Cuota íntegra ahorro
  const cuotaAhorro = calcularCuotaEscalas(baseAhorro / 100, ESCALA_AHORRO_TRAMOS)

  const totalCuota = cuotaIntegra + cuotaAhorro

  // Deducción DA 61ª — se excluyen dividendos (rentas del ahorro) de la base para esta deducción
  const baseDA61a = Math.max(0, datos.baseImponibleGeneral - datos.dividendosIRPF)
  const da61a = deduccionDA61a(cuotaIntegra, baseDA61a)
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
