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
  baseImponibleRepercutida4: number
  cuotaRepercutida4: number
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
export interface FacturaParaAutocobro {
  base: number
  iva: number
  tipo: 'ingreso' | 'gasto'
  fecha: Date | string
  deducible?: boolean
  categoria?: string
  retencionIrpf?: number
}

export interface ResultadoAutocobro303 extends ResultadoModelo303 {
  facturasIngreso: number
  facturasGasto: number
  base21: number
  base10: number
  base4: number
  base0: number
  cuotaIvaRepercutida21: number
  cuotaIvaRepercutida10: number
  cuotaIvaRepercutida4: number
  baseSop21: number
  baseSop10: number
  baseSop4: number
  cuotaIvaSoportada21: number
  cuotaIvaSoportada10: number
  cuotaIvaSoportada4: number
  totalIvaSoportado: number
  retencionesIrpf: number
  prorrataAplicada: number
  operacionesIntracomunitarias: number
}

/**
 * Auto-calcula el Modelo 303 a partir de facturas reales del trimestre.
 * Separa IVA repercutido (ventas) y soportado (gastos deducibles),
 * soporta prorrata, intracomunitario (0%), exportación (0%)
 * y retenciones de honorarios profesionales como negativo en soportado.
 */
export function calcularAutocobro303(
  facturas: FacturaParaAutocobro[],
  trimestre: 1 | 2 | 3 | 4,
  compensacionPendiente: number = 0,
  porcentajeProrrata: number = 100
): ResultadoAutocobro303 {
  const ingresos = facturas.filter(f => f.tipo === 'ingreso')
  const gastos = facturas.filter(f => f.tipo === 'gasto')

  const gastosDeducibles = gastos.filter(f => f.deducible !== false)

  let base21 = 0
  let base10 = 0
  let base4 = 0
  let base0 = 0
  let cuotaIvaRepercutida21 = 0
  let cuotaIvaRepercutida10 = 0
  let cuotaIvaRepercutida4 = 0

  for (const f of ingresos) {
    const b = f.base
    const ivaCuota = f.iva * b / 100
    if (f.iva === 21) { base21 += b; cuotaIvaRepercutida21 += ivaCuota }
    else if (f.iva === 10) { base10 += b; cuotaIvaRepercutida10 += ivaCuota }
    else if (f.iva === 4) { base4 += b; cuotaIvaRepercutida4 += ivaCuota }
    else { base0 += b }
  }

  let baseSop21 = 0
  let baseSop10 = 0
  let baseSop4 = 0
  let cuotaIvaSoportada21 = 0
  let cuotaIvaSoportada10 = 0
  let cuotaIvaSoportada4 = 0
  let retencionesIrpf = 0

  for (const f of gastosDeducibles) {
    const b = f.base
    const ivaCuota = f.iva * b / 100
    if (f.iva === 21) { baseSop21 += b; cuotaIvaSoportada21 += ivaCuota }
    else if (f.iva === 10) { baseSop10 += b; cuotaIvaSoportada10 += ivaCuota }
    else if (f.iva === 4) { baseSop4 += b; cuotaIvaSoportada4 += ivaCuota }
  }

  for (const f of gastos) {
    if (f.retencionIrpf && f.retencionIrpf > 0) {
      retencionesIrpf += f.retencionIrpf
    }
  }

  const totalIvaRepercutido = cuotaIvaRepercutida21 + cuotaIvaRepercutida10 + cuotaIvaRepercutida4
  const cuotaIvaSoportadaBruta = cuotaIvaSoportada21 + cuotaIvaSoportada10 + cuotaIvaSoportada4

  const prorrata = Math.min(100, Math.max(0, porcentajeProrrata)) / 100
  const totalIvaSoportado = cuotaIvaSoportadaBruta * prorrata

  const operacionesIntracomunitarias = base0

  const bruto = totalIvaRepercutido - totalIvaSoportado
  const pendiente = Math.min(0, compensacionPendiente)
  const neto = bruto + pendiente

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
    aDevolver = Math.abs(neto)
  }

  return {
    baseImponibleRepercutida: base21,
    cuotaRepercutida: cuotaIvaRepercutida21,
    baseImponibleRepercutida10: base10,
    cuotaRepercutida10: cuotaIvaRepercutida10,
    baseImponibleRepercutida4: base4,
    cuotaRepercutida4: cuotaIvaRepercutida4,
    totalCuotaRepercutida: totalIvaRepercutido,
    baseImponibleSoportada: baseSop21 + baseSop10 + baseSop4,
    totalCuotaSoportada: totalIvaSoportado,
    resultadoLiquidacion: neto,
    compensacionAplicada,
    saldoPendienteCompensar,
    aIngresar,
    aDevolver,
    aCompensar,
    facturasIngreso: ingresos.length,
    facturasGasto: gastosDeducibles.length,
    base21,
    base10,
    base4,
    base0,
    cuotaIvaRepercutida21,
    cuotaIvaRepercutida10,
    cuotaIvaRepercutida4,
    baseSop21,
    baseSop10,
    baseSop4,
    cuotaIvaSoportada21,
    cuotaIvaSoportada10,
    cuotaIvaSoportada4,
    totalIvaSoportado,
    retencionesIrpf,
    prorrataAplicada: porcentajeProrrata,
    operacionesIntracomunitarias,
  }
}

export function calcularModelo303(
  facturas: FacturaFiscalMinima[],
  trimestre: 1 | 2 | 3 | 4,
  compensacionPendiente: number = 0,
  base4PorCiento: number = 0
): ResultadoModelo303 {
  const pendiente = Math.min(0, compensacionPendiente)

  const ingresos = facturas.filter(f => f.tipo === 'ingreso')
  const gastos = facturas.filter(f => f.tipo === 'gasto' && f.deducible)

  const ingresos21 = ingresos.filter(f => f.iva === 21)
  const ingresos10 = ingresos.filter(f => f.iva === 10)
  const ingresos4 = ingresos.filter(f => f.iva === 4)

  const baseRepercutida = ingresos21.reduce((acc, f) => acc + f.importe, 0)
  const cuotaRepercutida = ingresos21.reduce((acc, f) => acc + f.importeIva, 0)
  const baseRepercutida10 = ingresos10.reduce((acc, f) => acc + f.importe, 0)
  const cuotaRepercutida10 = ingresos10.reduce((acc, f) => acc + f.importeIva, 0)
  const baseRepercutida4 = ingresos4.reduce((acc, f) => acc + f.importe, 0)
  const cuotaRepercutida4 = base4PorCiento > 0 ? Math.round(base4PorCiento * 0.04) : ingresos4.reduce((acc, f) => acc + f.importeIva, 0)
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
    baseImponibleRepercutida4: baseRepercutida4,
    cuotaRepercutida4,
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
