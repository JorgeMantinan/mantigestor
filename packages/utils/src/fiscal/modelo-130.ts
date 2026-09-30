/**
 * Modelo 130 — IRPF, estimación directa: pago fraccionado.
 * Base oficial: 20 % del rendimiento neto acumulado desde el 1 de enero hasta
 * el cierre del trimestre (art. 110 LIRPF y arts. 109-114 RIRPF).
 *
 * Del importe resultante se DEDUCEN (AEAT, «Importe de los pagos fraccionados»):
 * - Pagos fraccionados ya ingresados en el año.
 * - Retenciones e ingresos a cuenta (profesionales, arrendamientos, imagen...).
 * - Minoración por rendimientos previos: 25/50/75/100 € si los rendimientos netos
 *   del ejercicio anterior son ≤ 12.000 / 11.000 / 10.000 / 9.000 €.
 * - Deducción por adquisición de vivienda habitual: 2 % del rendimiento neto
 *   acumulado, con tope de 660,14 € por trimestre (2 % de 33.007,20 €), cuando se
 *   financia con financiación ajena, existe derecho a la deducción por inversión en
 *   vivienda habitual y los rendimientos íntegros previsibles son < 33.007,20 €.
 *   No procede con dos o más actividades, con rendimientos del trabajo comunicados
 *   al pagador ni si el destino es ampliación o construcción de vivienda.
 *
 * Los importes se expresan en la MISMA unidad que la entrada (la UI usa euros).
 */

export interface OpcionesModelo130 {
  /** Rendimientos netos de actividades económicas del ejercicio anterior (€) */
  rendimientosPreviosAnuales?: number
  /** ¿Procede la deducción del 2 % por adquisición de vivienda habitual? */
  deduccionVivienda?: boolean
}

/** Minoración fija por rendimientos del ejercicio anterior (0, 25, 50, 75 o 100 €) */
export function minoracionPagosFraccionados(rendimientosPrevios: number | undefined): number {
  if (rendimientosPrevios == null || rendimientosPrevios > 12_000) return 0
  if (rendimientosPrevios <= 9_000) return 100
  if (rendimientosPrevios <= 10_000) return 75
  if (rendimientosPrevios <= 11_000) return 50
  return 25
}

export const DEDUCCION_VIVIENDA_PCT = 0.02
/** Tope de la deducción por vivienda en cada trimestre (2 % de 33.007,20 €) */
export const DEDUCCION_VIVIENDA_MAX_TRIMESTRE = 660.14

export interface ResultadoModelo130 {
  ingresosAcumuladosAño: number
  gastosDeduciblesAcumulados: number
  rendimientoNeto: number
  porcentajeRetencion: number
  cuotaIntegra: number
  pagosAnterioresAño: number
  retencionesNomina: number
  /** Minoración por rendimientos del ejercicio anterior */
  minoracionOficial: number
  /** Deducción del 2 % por vivienda (tope 660,14 €/trimestre) */
  deduccionVivienda: number
  resultadoFinal: number
  aIngresar: number
  sinActividad: boolean
}

export const PORCENTAJE_PAGO_FRACCIONADO_130 = 0.2

/** Fila de la secuencia de pagos fraccionados trimestrales */
export interface PagoFraccionadoTrimestre {
  trimestre: 1 | 2 | 3 | 4
  /** Beneficio neto acumulado desde enero hasta el cierre del trimestre */
  beneficioAcumulado: number
  /** Cuota acumulada del año: 20 % × beneficio acumulado */
  cuotaAcumulada: number
  /** Pagos fraccionados ya ingresados en trimestres anteriores */
  pagosAnteriores: number
  /** Importe a ingresar en este trimestre (modelo 130) */
  aIngresar: number
}

export function calcularModelo130(
  ingresosAcumulados: number,
  gastosDeducibles: number,
  pagosAnteriores: number,
  retencionesNomina: number = 0,
  opciones: OpcionesModelo130 = {}
): ResultadoModelo130 {
  const rendimientoNeto = Math.max(0, ingresosAcumulados - gastosDeducibles)

  const cuotaIntegra = Math.round(rendimientoNeto * PORCENTAJE_PAGO_FRACCIONADO_130)

  const minoracionOficial = minoracionPagosFraccionados(opciones.rendimientosPreviosAnuales)

  let deduccionVivienda = 0
  if (opciones.deduccionVivienda && rendimientoNeto > 0) {
    deduccionVivienda = Math.min(
      Math.round(rendimientoNeto * DEDUCCION_VIVIENDA_PCT * 100) / 100,
      DEDUCCION_VIVIENDA_MAX_TRIMESTRE
    )
  }

  const resultadoFinal =
    cuotaIntegra - pagosAnteriores - retencionesNomina - minoracionOficial - deduccionVivienda
  const aIngresar = Math.max(0, resultadoFinal)

  return {
    ingresosAcumuladosAño: ingresosAcumulados,
    gastosDeduciblesAcumulados: gastosDeducibles,
    rendimientoNeto,
    porcentajeRetencion: PORCENTAJE_PAGO_FRACCIONADO_130 * 100,
    cuotaIntegra,
    pagosAnterioresAño: pagosAnteriores,
    retencionesNomina,
    minoracionOficial,
    deduccionVivienda,
    resultadoFinal,
    aIngresar,
    sinActividad: rendimientoNeto <= 0,
  }
}

/**
 * Secuencia oficial de pagos fraccionados trimestrales (art. 110 LIRPF):
 * la cuota se calcula sobre el beneficio neto ACUMULADO del año y se restan
 * los pagos ya ingresados en trimestres anteriores.
 *
 * @param beneficioNetoPorTrimestre Beneficio (ingresos − gastos deducibles) de cada trimestre, en el orden Q1..Q4. Puede ser negativo.
 */
export function pagosFraccionados130(beneficioNetoPorTrimestre: Array<number>) {
  let beneficioAcumulado = 0
  let pagosAnteriores = 0
  return ([1, 2, 3, 4] as const).map((trimestre, i) => {
    beneficioAcumulado += beneficioNetoPorTrimestre[i] ?? 0
    const cuotaAcumulada = Math.round(Math.max(0, beneficioAcumulado) * PORCENTAJE_PAGO_FRACCIONADO_130)
    const aIngresar = Math.max(0, cuotaAcumulada - pagosAnteriores)
    const fila = { trimestre, beneficioAcumulado, cuotaAcumulada, pagosAnteriores, aIngresar }
    pagosAnteriores += aIngresar
    return fila
  })
}
