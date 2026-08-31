/**
 * Mínimo multi-annual: reducción del 2% por cada año de actividad anteriores
 * al primer año en que la cuota íntegra del trimestre supera el 70% de la
 * cuota media de los tres primeros trimestres del ejercicio anterior.
 * Máximo 15%. Solo aplica a autónomos con más de 1 año de actividad.
 */
export function calcularMinimoMultiannual(aniosActividad: number): number {
  const reduccion = Math.min(15, Math.max(0, (aniosActividad - 1) * 2))
  return reduccion
}

/**
 * Reducción por rendimientos irregulares (art. 32 LIRPF):
 * Aplicable cuando más del 75% de los ingresos tienen un período > 1 año.
 * Reducción del 30% sobre el rendimiento neto (con límite de 300.000€/año).
 */
export function calcularReduccionIrregular(
  rendimientoNeto: number,
  esIrregular: boolean
): number {
  if (!esIrregular || rendimientoNeto <= 0) return 0
  const reduccion = Math.round(rendimientoNeto * 0.30)
  const limite = 300_000_00 // 300.000€ en céntimos
  return Math.min(reduccion, Math.round(limite * 0.30))
}

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
  reduccionMultiannual: number
  reduccionIrregular: number
  rendimientoNetoTrasReducciones: number
}

export function calcularModelo130(
  ingresosAcumulados: number,
  gastosDeducibles: number,
  pagosAnteriores: number,
  retencionesNomina: number = 0,
  aniosActividad: number = 1,
  esIrregular: boolean = false
): ResultadoModelo130 {
  const rendimientoNetoBruto = Math.max(0, ingresosAcumulados - gastosDeducibles)
  const PORCENTAJE = 0.20

  const reduccionMulti = Math.round(rendimientoNetoBruto * (calcularMinimoMultiannual(aniosActividad) / 100))
  const desReducMulti = rendimientoNetoBruto - reduccionMulti
  const reduccionIrreg = calcularReduccionIrregular(desReducMulti, esIrregular)
  const rendimientoNetoTras = Math.max(0, desReducMulti - reduccionIrreg)

  const cuotaIntegra = Math.round(rendimientoNetoTras * PORCENTAJE)
  const resultadoFinal = cuotaIntegra - pagosAnteriores - retencionesNomina
  const aIngresar = Math.max(0, resultadoFinal)

  return {
    ingresosAcumuladosAño: ingresosAcumulados,
    gastosDeduciblesAcumulados: gastosDeducibles,
    rendimientoNeto: rendimientoNetoBruto,
    porcentajeRetencion: PORCENTAJE * 100,
    cuotaIntegra,
    pagosAnterioresAño: pagosAnteriores,
    retencionesNomina,
    resultadoFinal,
    aIngresar,
    sinActividad: rendimientoNetoBruto <= 0,
    reduccionMultiannual: reduccionMulti,
    reduccionIrregular: reduccionIrreg,
    rendimientoNetoTrasReducciones: rendimientoNetoTras,
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
