/**
 * Modelo 194 — Resumen anual de retenciones e ingresos a cuenta.
 *
 * Concentra las retenciones practicadas a lo largo del año en todos los
 * modelos trimestrales (111, 115, 117, 123), así como las declaraciones
 * complementarias y rectificaciones.
 * Fuentes: Art. 61-75 RIRPF, art. 65-78 RIS, modelo oficial AEAT.
 */

export interface RetencionModelo194 {
  baseCents: number
  retencionCents: number
}

export interface DetalleRetenciones194 {
  r111: RetencionModelo194
  r115: RetencionModelo194
  r117: RetencionModelo194
  r123: RetencionModelo194
}

export interface ResultadoModelo194 {
  totalBasesCents: number
  totalRetencionesCents: number
  numDeclaraciones: number
  desglosePorModelo: {
    modelo: string
    baseCents: number
    retencionCents: number
  }[]
}

export function calcularModelo194(
  retenciones: DetalleRetenciones194
): ResultadoModelo194 {
  const modelos = [
    { modelo: '111', ...retenciones.r111 },
    { modelo: '115', ...retenciones.r115 },
    { modelo: '117', ...retenciones.r117 },
    { modelo: '123', ...retenciones.r123 },
  ]

  let totalBasesCents = 0
  let totalRetencionesCents = 0
  let numDeclaraciones = 0

  for (const m of modelos) {
    totalBasesCents += m.baseCents
    totalRetencionesCents += m.retencionCents
    if (m.baseCents > 0 || m.retencionCents > 0) {
      numDeclaraciones++
    }
  }

  return {
    totalBasesCents,
    totalRetencionesCents,
    numDeclaraciones,
    desglosePorModelo: modelos,
  }
}

export function formatearImporte194(cents: number): string {
  const euros = cents / 100
  return euros.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function porcentajeRetencion(baseCents: number, retencionCents: number): number {
  if (baseCents === 0) return 0
  return Math.round((retencionCents / baseCents) * 10000) / 100
}
