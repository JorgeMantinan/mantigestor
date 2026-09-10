/**
 * Modelo 206 — Pagos fraccionados por sociedades (IRPF sociedades).
 *
 * Declaración trimestral de pagos fraccionados sobre la base imponible
 * del ejercicio corriente, para entidades en estimación directa individual
 * cuya cifra de negocios sea inferior a 6 millones de euros.
 *
 * Tipo general: 18% sobre base imponible.
 * Grandes empresas (CN ≥ 6 M€): 24% sobre base imponible.
 *
 * Fuentes: Art. 40.1 y 40.3 LIS, modelo oficial AEAT.
 */

export type Trimestre206 = 1 | 2 | 3 | 4

export interface DatosModelo206 {
  /** Base imponible acumulada del ejercicio (céntimos) */
  baseImponibleCents: number
  /** Tipo de gravamen aplicable (%) — 18% general, 24% grandes empresas */
  tipoGravamenPct: number
  /** Pagos fraccionados ya ingresados en trimestres anteriores (céntimos) */
  pagosAnterioresCents: number
  /** Compensaciones de bases imponibles negativas pendientes (céntimos) */
  compensacionesPendientesCents: number
  /** Cifra de negocios del ejercicio anterior (céntimos) — para determinar tipo */
  cifraNegociosCents?: number
}

export interface DetalleTrimestre206 {
  trimestre: Trimestre206
  /** Base imponible para este trimestre (céntimos) */
  baseTrimestreCents: number
  /** Cuota íntegra del trimestre (céntimos) */
  cuotaIntegraCents: number
  /** Tipo aplicado (%) */
  tipoPct: number
  /** Retenciones y pagos a cuenta del trimestre (céntimos) */
  retencionesTrimestreCents: number
  /** Resultado del trimestre: positivo = a pagar, negativo = a devolver */
  resultadoTrimestreCents: number
}

export interface ResultadoModelo206 {
  tipoAplicable: string
  tipoPorcentaje: number
  baseImponibleCents: number
  cuotaIntegraTotalCents: number
  compensacionesCents: number
  cuotaLiquidaCents: number
  pagosAnterioresCents: number
  totalAPagarCents: number
  totalADevolverCents: number
  trimestres: DetalleTrimestre206[]
  avisos: string[]
}

function tipoPorCifra(cifraNegociosCents: number): number {
  if (cifraNegociosCents >= 600_000_000) return 24
  return 18
}

export function calcularModelo206(datos: DatosModelo206): ResultadoModelo206 {
  const avisos: string[] = []
  const tipoPorcentaje =
    datos.cifraNegociosCents !== undefined
      ? tipoPorCifra(datos.cifraNegociosCents)
      : datos.tipoGravamenPct

  const tipoAplicable =
    tipoPorcentaje >= 24
      ? `Grandes empresas (CN ≥ 6 M€) — ${tipoPorcentaje}%`
      : `General (< 6 M€) — ${tipoPorcentaje}%`

  // Base imponible tras compensaciones
  const baseImponible = Math.max(0, datos.baseImponibleCents - datos.compensacionesPendientesCents)

  // Cuota íntegra total
  const cuotaIntegraTotalCents = Math.round(baseImponible * (tipoPorcentaje / 100))

  // Pagos fraccionados trimestrales (sobre base imponible acumulada)
  const porcentajesTrimestre: Record<Trimestre206, number> = { 1: 18, 2: 18, 3: 17, 4: 17 }
  const trimestres: DetalleTrimestre206[] = []
  let acumuladoPagosCents = 0

  for (let t = 1 as Trimestre206; t <= 4; t++) {
    const pctTrimestre = porcentajesTrimestre[t]
    const cuotaIntegraCents = Math.round(baseImponible * (pctTrimestre / 100))

    // El pago fraccionado del trimestre es la cuota íntegra proporcional
    const pagoFraccionadoCents = cuotaIntegraCents
    acumuladoPagosCents += pagoFraccionadoCents

    // Retenciones del trimestre (se asume distribución uniforme si no se detallan)
    const retencionesTrimestreCents = 0

    // Resultado del trimestre
    const resultadoTrimestreCents = Math.max(
      0,
      pagoFraccionadoCents - retencionesTrimestreCents,
    )

    trimestres.push({
      trimestre: t,
      baseTrimestreCents: baseImponible,
      cuotaIntegraCents: cuotaIntegraCents,
      tipoPct: pctTrimestre,
      retencionesTrimestreCents,
      resultadoTrimestreCents,
    })
  }

  // Cuota líquida = cuota íntegra - compensaciones
  const cuotaLiquidaCents = Math.max(0, cuotaIntegraTotalCents - datos.compensacionesPendientesCents)

  // Total a pagar / devolver
  const totalAPagarCents = Math.max(0, cuotaLiquidaCents - datos.pagosAnterioresCents)
  const totalADevolverCents = Math.max(
    0,
    datos.pagosAnterioresCents - cuotaLiquidaCents,
  )

  // Avisos
  if (tipoPorcentaje >= 24) {
    avisos.push(`Tipo ${tipoPorcentaje}% aplicable por cifra de negocios ≥ 6 M€`)
  }

  if (datos.compensacionesPendientesCents > 0) {
    avisos.push(
      `Compensaciones de bases negativas pendientes: ${formatEUR(datos.compensacionesPendientesCents)}`,
    )
  }

  if (totalADevolverCents > 0) {
    avisos.push(`Resultado a devolver: ${formatEUR(totalADevolverCents)}`)
  }

  return {
    tipoAplicable,
    tipoPorcentaje,
    baseImponibleCents: baseImponible,
    cuotaIntegraTotalCents,
    compensacionesCents: datos.compensacionesPendientesCents,
    cuotaLiquidaCents,
    pagosAnterioresCents: datos.pagosAnterioresCents,
    totalAPagarCents,
    totalADevolverCents,
    trimestres,
    avisos,
  }
}

function formatEUR(cents: number): string {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(cents / 100)
}

export const TRIMESTRES_206 = [1, 2, 3, 4] as const
