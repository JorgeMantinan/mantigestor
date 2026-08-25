export interface ResultadoModelo130 {
  ingresosAcumuladosAño: number
  gastosDeduciblesAcumulados: number
  rendimientoNeto: number
  porcentajeRetencion: number
  cuotaIntegra: number
  pagosAnterioresAño: number
  retencionesNomina: number
  resultadoFinal: number
  aIngresar: number
  sinActividad: boolean
}

export function calcularModelo130(
  ingresosAcumulados: number,
  gastosDeducibles: number,
  pagosAnteriores: number,
  retencionesNomina: number = 0
): ResultadoModelo130 {
  const rendimientoNeto = Math.max(0, ingresosAcumulados - gastosDeducibles)
  const PORCENTAJE = 0.20

  const cuotaIntegra = Math.round(rendimientoNeto * PORCENTAJE)
  const resultadoFinal = cuotaIntegra - pagosAnteriores - retencionesNomina
  const aIngresar = Math.max(0, resultadoFinal)

  return {
    ingresosAcumuladosAño: ingresosAcumulados,
    gastosDeduciblesAcumulados: gastosDeducibles,
    rendimientoNeto,
    porcentajeRetencion: PORCENTAJE * 100,
    cuotaIntegra,
    pagosAnterioresAño: pagosAnteriores,
    retencionesNomina,
    resultadoFinal,
    aIngresar,
    sinActividad: rendimientoNeto <= 0,
  }
}

export interface PagoFraccionadoTrimestre {
  trimestre: 1 | 2 | 3 | 4
  /** Beneficio neto acumulado desde enero hasta el cierre del trimestre */
  beneficioAcumulado: number
  /** Cuota acumulada del año: 20% × beneficio acumulado */
  cuotaAcumulada: number
  /** Pagos fraccionados ya ingresados en trimestres anteriores */
  pagosAnteriores: number
  /** Importe a ingresar en este trimestre (modelo 130) */
  aIngresar: number
}

/**
 * Secuencia real de pagos fraccionados del modelo 130: la cuota se calcula
 * sobre el rendimiento neto ACUMULADO del año y se restan los pagos ya
 * ingresados en trimestres anteriores (art. 110 LIRPF).
 *
 * @param beneficioNetoPorTrimestre Beneficio (ingresos − gastos deducibles) de cada trimestre, en el orden Q1..Q4. Puede ser negativo.
 */
export function pagosFraccionados130(
  beneficioNetoPorTrimestre: Array<number>
): Array<PagoFraccionadoTrimestre> {
  let beneficioAcumulado = 0
  let pagosAnteriores = 0
  return ([1, 2, 3, 4] as const).map((trimestre, i) => {
    beneficioAcumulado += beneficioNetoPorTrimestre[i] ?? 0
    const cuotaAcumulada = Math.round(Math.max(0, beneficioAcumulado) * 0.2)
    const aIngresar = Math.max(0, cuotaAcumulada - pagosAnteriores)
    const fila = { trimestre, beneficioAcumulado, cuotaAcumulada, pagosAnteriores, aIngresar }
    pagosAnteriores += aIngresar
    return fila
  })
}
