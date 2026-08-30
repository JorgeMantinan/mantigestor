/**
 * Modelo 182 — Declaración informativa de donatarias y donatarios.
 *
 * Recoge las donaciones recibidas por entidades donatarias
 * que generan derecho a deducción en el IRPF (art. 19 LIRPF).
 * Fuentes: Art. 19 LIRPF, art. 72-74 RIRPF, modelo oficial AEAT.
 */

export interface Donacion182 {
  /** Nombre del donante */
  donante: string
  /** NIF del donante */
  nifDonante: string
  /** Comunidad Autónoma del donante */
  ccaaDonante: string
  /** Importe total de la donación en céntimos */
  importeDonacionesCents: number
  /** Importe de la deducción aplicable en céntimos */
  importeDeduccionCents: number
}

export interface DesgloseCCAA182 {
  ccaa: string
  numDonaciones: number
  totalImporteCents: number
  totalDeduccionCents: number
}

export interface ResultadoModelo182 {
  totalDonacionesCents: number
  totalDeduccionesCents: number
  numDonantes: number
  numDonaciones: number
  desglosePorCCAA: DesgloseCCAA182[]
}

export function calcularModelo182(
  donaciones: Donacion182[]
): ResultadoModelo182 {
  let totalDonacionesCents = 0
  let totalDeduccionesCents = 0
  const donantes = new Set<string>()
  const porCCAA = new Map<string, DesgloseCCAA182>()

  for (const d of donaciones) {
    totalDonacionesCents += d.importeDonacionesCents
    totalDeduccionesCents += d.importeDeduccionCents
    donantes.add(d.nifDonante || d.donante)

    const existente = porCCAA.get(d.ccaaDonante)
    if (existente) {
      existente.numDonaciones++
      existente.totalImporteCents += d.importeDonacionesCents
      existente.totalDeduccionCents += d.importeDeduccionCents
    } else {
      porCCAA.set(d.ccaaDonante, {
        ccaa: d.ccaaDonante,
        numDonaciones: 1,
        totalImporteCents: d.importeDonacionesCents,
        totalDeduccionCents: d.importeDeduccionCents,
      })
    }
  }

  return {
    totalDonacionesCents,
    totalDeduccionesCents,
    numDonantes: donantes.size,
    numDonaciones: donaciones.length,
    desglosePorCCAA: Array.from(porCCAA.values()),
  }
}

export function formatearImporte182(cents: number): string {
  const euros = cents / 100
  return euros.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
