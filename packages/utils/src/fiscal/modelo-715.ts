/**
 * Modelo 715 — Declaración informativa de inversiones y bienes en el extranjero.
 *
 * Similar al modelo 720 pero enfocado específicamente en inversiones.
 * Obligatorio para residentes fiscales con inversiones en el extranjero
 * cuyo valor supere los 50.000 €.
 * Fuentes: Art. 42.1.b Ley 58/2003, normativa AEAT.
 */

export interface InversionExtranjero715 {
  /** Tipo de inversión: valores, participaciones o bienes muebles */
  tipo: 'valores' | 'participaciones' | 'muebles'
  /** Entidad o depositario */
  entidad: string
  /** País de la inversión */
  pais: string
  /** Fecha de adquisición (YYYY-MM-DD) */
  fechaAdquisicion: string
  /** Valor de adquisición (céntimos) */
  valorAdquisicionCents: number
  /** Valor actual a 31 de diciembre (céntimos) */
  valorActualCents: number
}

export interface ResultadoModelo715 {
  totalValores: number
  totalParticipaciones: number
  totalMuebles: number
  totalGlobal: number
  inversionesPorPais: Record<string, number>
  numInversiones: number
}

export function calcularModelo715(
  inversiones: InversionExtranjero715[]
): ResultadoModelo715 {
  let totalValores = 0
  let totalParticipaciones = 0
  let totalMuebles = 0
  const inversionesPorPais: Record<string, number> = {}

  for (const inv of inversiones) {
    const valor = inv.valorActualCents
    switch (inv.tipo) {
      case 'valores':
        totalValores += valor
        break
      case 'participaciones':
        totalParticipaciones += valor
        break
      case 'muebles':
        totalMuebles += valor
        break
    }
    inversionesPorPais[inv.pais] = (inversionesPorPais[inv.pais] || 0) + valor
  }

  return {
    totalValores,
    totalParticipaciones,
    totalMuebles,
    totalGlobal: totalValores + totalParticipaciones + totalMuebles,
    inversionesPorPais,
    numInversiones: inversiones.length,
  }
}
