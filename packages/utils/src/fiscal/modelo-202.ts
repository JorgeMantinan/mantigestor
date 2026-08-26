/**
 * Modelo 202 — Declaración trimestral del Impuesto sobre Sociedades
 * y del Impuesto sobre la Renta de no Residentes (pagos fraccionados).
 *
 * Fuentes: Art. 40.2 LIS (Ley 27/2014), modelo oficial AEAT.
 *
 * El pago fraccionado se calcula sobre la cuota íntegra del último periodo.
 * Tipos: 5% (general), 17% (entidades de reducida dimensión).
 * Para nuevos contribuyentes: 18% sobre base imponible del trimestre.
 */

export interface PagoFraccionadoSociedades {
  /** Tipo de contribuyente */
  tipoContribuyente: 'nuevo' | 'general' | 'reducida_dimencion'
  /** Cuota íntegra del último periodo declarado (céntimos) */
  cuotaIntegraUltimoPeriodoCents: number
  /** Base imponible del trimestre actual (solo para nuevos contribuyentes) */
  baseImponibleTrimestreCents: number
  /** Pagos fraccionados anteriores del año (céntimos) */
  pagosAnterioresCents: number
}

export interface ResultadoModelo202 {
  tipoAplicable: string
  tipoPorcentaje: number
  baseCalculoCents: number
  pagoTrimestralCents: number
  pagosAnterioresCents: number
  totalAPagarCents: number
  /** Cuota anual estimada */
  cuotaAnualEstimadaCents: number
}

export function calcularModelo202(
  params: PagoFraccionadoSociedades
): ResultadoModelo202 {
  let tipoPorcentaje: number
  let tipoAplicable: string
  let baseCalculoCents: number

  if (params.tipoContribuyente === 'nuevo') {
    // Art. 40.3 LIS: 18% sobre base imponible del trimestre
    tipoPorcentaje = 18
    tipoAplicable = 'Nuevo contribuyente (18% base imponible trimestre)'
    baseCalculoCents = params.baseImponibleTrimestreCents
  } else if (params.tipoContribuyente === 'reducida_dimencion') {
    // Art. 40.2.b LIS: 17% sobre cuota íntegra del último periodo
    tipoPorcentaje = 17
    tipoAplicable = 'Reducida dimensión (17% cuota íntegra)'
    baseCalculoCents = params.cuotaIntegraUltimoPeriodoCents
  } else {
    // Art. 40.2.a LIS: 5% sobre cuota íntegra del último periodo
    tipoPorcentaje = 5
    tipoAplicable = 'General (5% cuota íntegra)'
    baseCalculoCents = params.cuotaIntegraUltimoPeriodoCents
  }

  const pagoTrimestralCents = Math.round(baseCalculoCents * (tipoPorcentaje / 100))
  const totalAPagarCents = Math.max(0, pagoTrimestralCents - params.pagosAnterioresCents)
  const cuotaAnualEstimadaCents = pagoTrimestralCents * 4

  return {
    tipoAplicable,
    tipoPorcentaje,
    baseCalculoCents,
    pagoTrimestralCents,
    pagosAnterioresCents: params.pagosAnterioresCents,
    totalAPagarCents,
    cuotaAnualEstimadaCents,
  }
}
