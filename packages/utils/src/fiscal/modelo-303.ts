/** Campos mínimos necesarios para liquidar el 303 (estructural, compatible con filas de BD) */
export interface FacturaFiscalMinima {
  tipo: 'ingreso' | 'gasto'
  importe: number
  iva: number
  importeIva: number
  deducible?: boolean | null
}

export interface ResultadoModelo303 {
  baseImponibleRepercutida: number
  cuotaRepercutida: number
  baseImponibleRepercutida10: number
  cuotaRepercutida10: number
  totalCuotaRepercutida: number
  baseImponibleSoportada: number
  totalCuotaSoportada: number
  /** Resultado del trimestre tras aplicar la compensación pendiente */
  resultadoLiquidacion: number
  /** Compensación de trimestres anteriores aplicada en este trimestre (valor absoluto) */
  compensacionAplicada: number
  /** Saldo negativo que queda pendiente para el siguiente trimestre (0 si no queda nada) */
  saldoPendienteCompensar: number
  aIngresar: number
  aDevolver: number
  aCompensar: number
}

/**
 * Modelo 303 con compensación de resultados negativos dentro del año natural
 * (art. 84 RIVA): los saldos a compensar de trimestres anteriores minan los
 * resultados positivos posteriores; en el 4T no puede quedar saldo pendiente,
 * el negativo se devuelve (art. 91.RIVA / regla de devolución).
 *
 * @param compensacionPendiente Saldo negativo acumulado de trimestres anteriores (<= 0)
 */
export function calcularModelo303(
  facturas: FacturaFiscalMinima[],
  trimestre: 1 | 2 | 3 | 4,
  compensacionPendiente: number = 0
): ResultadoModelo303 {
  const pendiente = Math.min(0, compensacionPendiente)

  const ingresos = facturas.filter(f => f.tipo === 'ingreso')
  const gastos = facturas.filter(f => f.tipo === 'gasto' && f.deducible)

  const ingresos21 = ingresos.filter(f => f.iva === 21)
  const ingresos10 = ingresos.filter(f => f.iva === 10)

  const baseRepercutida = ingresos21.reduce((acc, f) => acc + f.importe, 0)
  const cuotaRepercutida = ingresos21.reduce((acc, f) => acc + f.importeIva, 0)
  const baseRepercutida10 = ingresos10.reduce((acc, f) => acc + f.importe, 0)
  const cuotaRepercutida10 = ingresos10.reduce((acc, f) => acc + f.importeIva, 0)
  const totalCuotaRepercutida = ingresos.reduce((acc, f) => acc + f.importeIva, 0)

  const baseSoportada = gastos.reduce((acc, f) => acc + f.importe, 0)
  const totalCuotaSoportada = gastos.reduce((acc, f) => acc + f.importeIva, 0)

  const bruto = totalCuotaRepercutida - totalCuotaSoportada
  const neto = bruto + pendiente

  // Compensación efectivamente usada: no puede convertir el resultado en positivo
  const compensacionAplicada =
    pendiente < 0 ? Math.min(Math.abs(pendiente), Math.max(0, bruto)) : 0

  let aIngresar = 0
  let aDevolver = 0
  let aCompensar = 0
  let saldoPendienteCompensar = 0

  if (neto >= 0) {
    aIngresar = neto
  } else if (trimestre < 4) {
    aCompensar = Math.abs(neto)
    saldoPendienteCompensar = neto
  } else {
    // 4T: no se admite saldo a compensar pendiente → devolución
    aDevolver = Math.abs(neto)
  }

  return {
    baseImponibleRepercutida: baseRepercutida,
    cuotaRepercutida,
    baseImponibleRepercutida10: baseRepercutida10,
    cuotaRepercutida10,
    totalCuotaRepercutida,
    baseImponibleSoportada: baseSoportada,
    totalCuotaSoportada,
    resultadoLiquidacion: neto,
    compensacionAplicada,
    saldoPendienteCompensar,
    aIngresar,
    aDevolver,
    aCompensar,
  }
}

/** Calcula la secuencia anual de liquidaciones 303 arrastrando compensaciones entre trimestres */
export function resultadosIvaAnuales(
  facturasPorTrimestre: Array<FacturaFiscalMinima[]>
): Array<ResultadoModelo303> {
  const resultados: Array<ResultadoModelo303> = []
  let pendiente = 0
  for (let t = 1; t <= 4; t++) {
    const res = calcularModelo303(facturasPorTrimestre[t - 1] ?? [], (t as 1 | 2 | 3 | 4), pendiente)
    resultados.push(res)
    pendiente = res.saldoPendienteCompensar
  }
  return resultados
}
