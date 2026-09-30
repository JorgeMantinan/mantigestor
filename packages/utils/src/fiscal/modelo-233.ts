/**
 * Modelo 233 — Declaración informativa por gastos en guarderías o centros de
 * educación infantil autorizados.
 *
 * Obligado a presentarla: EXCLUSIVAMENTE la guardería o centro de educación
 * infantil autorizado (no los progenitores). Orden HAC/1400/2018 (modificada por
 * la Orden HAC/682/2025, BOE 2-7-2025 — ejercicios 2025 y siguientes).
 *
 * Contenido oficial (art. 69.9 RIRPF): datos de identificación de los menores,
 * meses completos en el centro, gastos anuales pagados e importes subvencionados.
 * Plazo: mes de enero en relación con el año anterior (del 1 de enero al 2 de
 * febrero de 2026 según el calendario de la AEAT).
 *
 * Vinculación: los gastos informados respaldan el incremento de la deducción por
 * maternidad del art. 81.2 LIRPF (hasta 1.000 €: 25 % de los primeros 4.000 €
 * de gastos de custodia de menores de 3 años).
 */

export const MAX_MESES_MENOR_233 = 12
export const DEDUCCION_MAXIMA_GUARDERIA_CENTS = 100_000 // 1.000 € (incremento art. 81.2 LIRPF)
export const BASE_GUARDERIA_PARA_DEDUCCION_CENTS = 400_000 // 4.000 € (25 % → 1.000 €)
export const TIPO_INCREMENTO_GUARDERIA_PCT = 25

export interface Menor233 {
  /** NIF del menor */
  nif: string
  /** Apellidos y nombre */
  nombre: string
  /** Meses completos de custodia en el centro (1-12) */
  meses: number
  /** Gastos anuales pagados al centro en céntimos */
  gastosPagadosCents: number
  /** Importe subvencionado que se abona al centro en céntimos */
  subvencionCents: number
}

export interface DatosModelo233 {
  menores: Menor233[]
}

export interface ResultadoModelo233 {
  numMenores: number
  gastosTotalesCents: number
  subvencionesTotalesCents: number
  /** Gastos no subvencionados (gastos − subvención) */
  gastosNetosCents: number
  /** Incremento máximo de la deducción por maternidad que puede respaldar (1.000 € por perceptora) */
  incrementoMaximoDeduccionCents: number
  avisos: string[]
}

export function calcularModelo233(datos: DatosModelo233): ResultadoModelo233 {
  const avisos: string[] = []
  let gastosTotalesCents = 0
  let subvencionesTotalesCents = 0

  for (const menor of datos.menores) {
    const gastos = Math.max(0, menor.gastosPagadosCents)
    const subvencion = Math.max(0, menor.subvencionCents)
    gastosTotalesCents += gastos
    subvencionesTotalesCents += subvencion
    if (menor.meses < 1 || menor.meses > MAX_MESES_MENOR_233) {
      avisos.push(`Meses fuera de rango (1-12) para ${menor.nombre || menor.nif}.`)
    }
    if (subvencion > gastos) {
      avisos.push(`La subvención supera los gastos pagados para ${menor.nombre || menor.nif}.`)
    }
  }

  const gastosNetosCents = Math.max(0, gastosTotalesCents - subvencionesTotalesCents)

  return {
    numMenores: datos.menores.length,
    gastosTotalesCents,
    subvencionesTotalesCents,
    gastosNetosCents,
    incrementoMaximoDeduccionCents: DEDUCCION_MAXIMA_GUARDERIA_CENTS,
    avisos,
  }
}

/** Incremento de la deducción por maternidad por gastos de custodia (25 % de hasta 4.000 €) */
export function incrementoDeduccionGuarderia(gastosNetosCents: number): number {
  const base = Math.min(Math.max(0, gastosNetosCents), BASE_GUARDERIA_PARA_DEDUCCION_CENTS)
  return Math.min(Math.round(base * (TIPO_INCREMENTO_GUARDERIA_PCT / 100)), DEDUCCION_MAXIMA_GUARDERIA_CENTS)
}
