/**
 * Modelo 202 — IS/IRNR (EP): pagos fraccionados.
 *
 * Dos modalidades oficiales (art. 40 LIS y folleto AEAT de actividades económicas 4.8.1):
 * - Modalidad general (art. 40.2): 18 % sobre la cuota íntegra del último período
 *   vencido, minorada por deducciones, bonificaciones y retenciones. Se ingresa en
 *   cada uno de los tres plazos (abril, octubre y diciembre).
 * - Modalidad opcional por base imponible (art. 40.3; OBLIGATORIA si la cifra de
 *   negocios ≥ 6.000.000 €): sobre la base imponible de los 3, 9 u 11 primeros meses:
 *     · INNCF < 10.000.000 €: 5/7 del tipo de gravamen redondeado por defecto
 *       (tipo general 25 % → 17 %).
 *     · INNCF ≥ 10.000.000 €: 19/20 del tipo de gravamen redondeado por exceso
 *       (tipo general 25 % → 24 %).
 *   Se deducen bonificaciones, retenciones y pagos fraccionados anteriores.
 */

export type Modalidad202 = 'cuota' | 'base'
export type Entidad202 = 'general' | 'reducida' | 'micro' | 'nueva'

/** Tipos de gravamen de la LIS (art. 29) vigentes en 2026 */
export const TIPOS_GRAVAMEN_IS_2026: Record<Entidad202, number> = {
  general: 25,
  reducida: 23,
  micro: 21,
  nueva: 15,
}

export const ETIQUETA_ENTIDAD_202: Record<Entidad202, string> = {
  general: 'General (25 %)',
  reducida: 'Reducida dimensión — 1-10 M€ (23 % en 2026)',
  micro: 'Micropyme < 1 M€ — tramo de más de 50.000 € (21 % en 2026)',
  nueva: 'Nueva creación (15 %)',
}

export interface PagoFraccionadoSociedades {
  modalidad: Modalidad202
  entidad: Entidad202
  /** Cuota íntegra minorada del último período (modalidad cuota) en céntimos */
  cuotaIntegraUltimoPeriodoCents: number
  /** Base imponible del periodo 3/9/11 meses menos retenciones (modalidad base), céntimos */
  baseImponiblePeriodoCents: number
  /** Pagos fraccionados ya ingresados en el ejercicio (modalidad base), céntimos */
  pagosAnterioresCents: number
  /** ¿Cifra de negocios ≥ 10 M€ en los 12 meses anteriores? (19/20 por exceso) */
  cifraNegocios10M?: boolean
}

export interface ResultadoModelo202 {
  modalidad: Modalidad202
  tipoAplicable: string
  tipoPorcentaje: number
  baseCalculoCents: number
  /** Importe a ingresar por plazo */
  pagoTrimestralCents: number
  pagosAnterioresCents: number
  totalAPagarCents: number
  /** Total estimado del año (3 plazos: abril, octubre y diciembre) */
  totalAnualEstimadoCents: number
}

function porcentajeModalidadBase(tipoGravamen: number, cifraNegocios10M: boolean): number {
  if (cifraNegocios10M) {
    // 19/20 × tipo, redondeado por exceso
    return Math.ceil((19 / 20) * tipoGravamen)
  }
  // 5/7 × tipo, redondeado por defecto (a la unidad inferior)
  return Math.floor((5 / 7) * tipoGravamen)
}

export function calcularModelo202(params: PagoFraccionadoSociedades): ResultadoModelo202 {
  let tipoPorcentaje: number
  let baseCalculoCents: number
  let tipoAplicable: string
  let pagoTrimestralCents: number

  if (params.modalidad === 'cuota') {
    tipoPorcentaje = 18
    tipoAplicable = 'Modalidad cuota íntegra: 18 % (art. 40.2 LIS)'
    baseCalculoCents = params.cuotaIntegraUltimoPeriodoCents
    pagoTrimestralCents = Math.round(baseCalculoCents * (tipoPorcentaje / 100))
  } else if (params.entidad === 'micro') {
    // Escala de micropyme por tramos (como las casillas "Base a tipo 1/tipo 2" del 202):
    // 19 % sobre los primeros 50.000 € de base y 21 % sobre el exceso (2026),
    // aplicando a cada tramo el porcentaje 5/7 (o 19/20) redondeado.
    const m10 = params.cifraNegocios10M ?? false
    const base = params.baseImponiblePeriodoCents
    const tramo1 = Math.min(base, 5_000_000)
    const tramo2 = Math.max(0, base - 5_000_000)
    const pct1 = porcentajeModalidadBase(19, m10)
    const pct2 = porcentajeModalidadBase(21, m10)
    tipoPorcentaje = tramo2 > 0 ? pct2 : pct1
    tipoAplicable = `Modalidad base micropyme: ${pct1} % hasta 50.000 € y ${pct2} % sobre el exceso`
    baseCalculoCents = base
    pagoTrimestralCents = Math.round(tramo1 * (pct1 / 100)) + Math.round(tramo2 * (pct2 / 100))
  } else {
    const tipoGravamen = TIPOS_GRAVAMEN_IS_2026[params.entidad]
    tipoPorcentaje = porcentajeModalidadBase(tipoGravamen, params.cifraNegocios10M ?? false)
    tipoAplicable = params.cifraNegocios10M
      ? `Modalidad base: 19/20 × ${tipoGravamen} % → ${tipoPorcentaje} % (≥ 10 M€)`
      : `Modalidad base: 5/7 × ${tipoGravamen} % → ${tipoPorcentaje} % (< 10 M€)`
    baseCalculoCents = params.baseImponiblePeriodoCents
    pagoTrimestralCents = Math.round(baseCalculoCents * (tipoPorcentaje / 100))
  }

  const totalAPagarCents = Math.max(0, pagoTrimestralCents - params.pagosAnterioresCents)

  return {
    modalidad: params.modalidad,
    tipoAplicable,
    tipoPorcentaje,
    baseCalculoCents,
    pagoTrimestralCents,
    pagosAnterioresCents: params.pagosAnterioresCents,
    totalAPagarCents,
    totalAnualEstimadoCents: pagoTrimestralCents * 3,
  }
}
