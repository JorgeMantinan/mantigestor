/**
 * Generación automática de reporte trimestral fiscal.
 */

export interface DatosTrimestre {
  trimestre: 1 | 2 | 3 | 4
  anyo: number
  ingresos: number // cents
  gastos: number // cents
  ivaRepercutido: number // cents
  ivaSoportado: number // cents
  retencionesIRPF: number // cents
  pagosFraccionados: number // cents
}

export interface ReporteTrimestral {
  titulo: string
  periodo: string
  ingresos: number
  gastos: number
  beneficioNeto: number
  ivaAPagar: number
  ivaSoportado: number
  ivaLiquidado: number
  retencionesIRPF: number
  pagosFraccionados: number
  baseImponible130: number
  cuota130: number
  NETWORK: string
}

const QUARTER_MONTHS: Record<number, string[]> = {
  1: ['Enero', 'Febrero', 'Marzo'],
  2: ['Abril', 'Mayo', 'Junio'],
  3: ['Julio', 'Agosto', 'Septiembre'],
  4: ['Octubre', 'Noviembre', 'Diciembre'],
}

/**
 * Genera un reporte trimestral consolidado.
 */
export function generarReporteTrimestral(datos: DatosTrimestre): ReporteTrimestral {
  const { trimestre, anyo, ingresos, gastos, ivaRepercutido, ivaSoportado, retencionesIRPF, pagosFraccionados } = datos

  const beneficioNeto = ingresos - gastos
  const ivaLiquidado = ivaRepercutido - ivaSoportado
  const ivaAPagar = Math.max(0, ivaLiquidado)

  // Modelo 130: 20% del beneficio neto trimestral
  const baseImponible130 = beneficioNeto
  const cuota130 = Math.round(baseImponible130 * 0.2)

  const meses = QUARTER_MONTHS[trimestre] ?? []
  const periodo = `${meses.join(', ')} ${anyo}`

  return {
    titulo: `Reporte Trimestral Q${trimestre} ${anyo}`,
    periodo,
    ingresos,
    gastos,
    beneficioNeto,
    ivaAPagar,
    ivaSoportado,
    ivaLiquidado,
    retencionesIRPF,
    pagosFraccionados,
    baseImponible130,
    cuota130,
    NETWORK: 'EUR',
  }
}

/**
 * Genera el contenido CSV del reporte trimestral.
 */
export function reporteTrimestralCSV(reporte: ReporteTrimestral): string {
  const formatEur = (cents: number) => (cents / 100).toFixed(2)
  const lines = [
    reporte.titulo,
    `Periodo: ${reporte.periodo}`,
    '',
    'Concepto,Importe (€)',
    `Ingresos,${formatEur(reporte.ingresos)}`,
    `Gastos,${formatEur(reporte.gastos)}`,
    `Beneficio neto,${formatEur(reporte.beneficioNeto)}`,
    '',
    'IVA',
    `IVA repercutido,${formatEur(reporte.ivaAPagar + reporte.ivaSoportado)}`,
    `IVA soportado,${formatEur(reporte.ivaSoportado)}`,
    `IVA liquidado,${formatEur(reporte.ivaLiquidado)}`,
    `IVA a pagar,${formatEur(reporte.ivaAPagar)}`,
    '',
    'IRPF',
    `Retenciones IRPF,${formatEur(reporte.retencionesIRPF)}`,
    `Pagos fraccionados,${formatEur(reporte.pagosFraccionados)}`,
    '',
    'Modelo 130',
    `Base imponible,${formatEur(reporte.baseImponible130)}`,
    `Cuota (20%),${formatEur(reporte.cuota130)}`,
  ]
  return lines.join('\n')
}
