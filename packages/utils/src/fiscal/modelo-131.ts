/**
 * Modelo 131 — IRPF estimación objetiva (módulos)
 *
 * Declaración trimestral para autónomos en régimen de módulos.
 * Cálculo simplificado: suma de (unidades × módulo) × tipo de retención.
 *
 * Fuentes: Real Decreto que aprueba los módulos, Art. 31 LIRPF.
 */

export interface ActividadModulo {
  /** Concepto o nombre de la actividad */
  concepto: string
  /** Clave de la actividad (código IAE o clave módulo) */
  clave: string
  /** Unidades realizadas en el trimestre */
  unidades: number
  /** Precio unitario del módulo (céntimos) */
  precioUnitario: number
  /** Tipo de retención aplicable: 19% general o 20% si exceed threshold */
  tipoIRPF: number
}

export interface DatosModelo131 {
  actividades: ActividadModulo[]
  /** Pagos fraccionados ya ingresados en trimestres anteriores del año (céntimos) */
  pagosAnteriores: number
}

export interface ResultadoModelo131 {
  /** Base imponible total del trimestre */
  baseImponible: number
  /** Cuota íntegra del trimestre */
  cuotaIntegra: number
  /** Pagos fraccionados de trimestres anteriores */
  pagosAnteriores: number
  /** Resultado: a ingresar o a devolver */
  resultado: number
  aIngresar: number
  aDevolver: number
  /** Desglose por actividad */
  desglose: Array<{
    concepto: string
    clave: string
    baseImponible: number
    cuota: number
  }>
}

export function calcularModelo131(datos: DatosModelo131): ResultadoModelo131 {
  let baseImponible = 0
  let cuotaIntegra = 0
  const desglose: ResultadoModelo131['desglose'] = []

  for (const act of datos.actividades) {
    const base = Math.round(act.unidades * act.precioUnitario)
    const cuota = Math.round(base * (act.tipoIRPF / 100))
    baseImponible += base
    cuotaIntegra += cuota
    desglose.push({
      concepto: act.concepto,
      clave: act.clave,
      baseImponible: base,
      cuota,
    })
  }

  const resultado = cuotaIntegra - datos.pagosAnteriores

  return {
    baseImponible,
    cuotaIntegra,
    pagosAnteriores: datos.pagosAnteriores,
    resultado,
    aIngresar: Math.max(0, resultado),
    aDevolver: Math.max(0, -resultado),
    desglose,
  }
}
