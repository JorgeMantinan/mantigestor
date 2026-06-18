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
