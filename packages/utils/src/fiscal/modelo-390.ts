/**
 * Modelo 390 — Resumen anual del IVA.
 *
 * Agrega las liquidaciones trimestrales (Modelo 303) de un ejercicio y produce el
 * resumen anual que debe presentarse en enero del año siguiente.
 */

import type { ResultadoModelo303 } from './modelo-303'

export interface ResultadoModelo390 {
  /** Suma de bases imponibles repercutidas (21% + 10%) anual */
  baseImponibleRepercutidaAnual: number
  /** Cuota total repercutida (cobrada) anual */
  totalCuotaRepercutida: number
  /** Base imponible soportada deducible anual */
  baseImponibleSoportadaAnual: number
  /** Cuota total soportada (pagada) anual */
  totalCuotaSoportada: number
  /** Compensaciones de trimestres anteriores aplicadas en el año */
  totalCompensaciones: number
  /** Total a ingresar en el año (suma de aIngresar por trimestre) */
  totalAIngresar: number
  /** Total a devolver en el año (suma de aDevolver) */
  totalADevolver: number
  /** Total a compensar (intertrimestral) en el año */
  totalACompensar: number
  /** Resultado neto: cuota repercutida − cuota soportada */
  resultadoNeto: number
  /** true si el resultado neto es a ingresar (positivo) */
  esAIngresar: boolean
  /** Fila "electrónica" por trimestre para el cuadro del modelo */
  porTrimestre: Array<{
    trimestre: 1 | 2 | 3 | 4
    baseRepercutida: number
    cuotaRepercutida: number
    baseSoportada: number
    cuotaSoportada: number
    resultado: number
  }>
}

export function calcularModelo390(
  trimestres: Array<ResultadoModelo303>,
): ResultadoModelo390 {
  const baseImponibleRepercutidaAnual = trimestres.reduce(
    (s, r) => s + r.baseImponibleRepercutida + r.baseImponibleRepercutida10 + r.baseImponibleRepercutida4,
    0,
  )
  const totalCuotaRepercutida = trimestres.reduce((s, r) => s + r.totalCuotaRepercutida, 0)
  const baseImponibleSoportadaAnual = trimestres.reduce((s, r) => s + r.baseImponibleSoportada, 0)
  const totalCuotaSoportada = trimestres.reduce((s, r) => s + r.totalCuotaSoportada, 0)
  const totalCompensaciones = trimestres.reduce((s, r) => s + r.compensacionAplicada, 0)
  const totalAIngresar = trimestres.reduce((s, r) => s + r.aIngresar, 0)
  const totalADevolver = trimestres.reduce((s, r) => s + r.aDevolver, 0)
  const totalACompensar = trimestres.reduce((s, r) => s + r.aCompensar, 0)

  const resultadoNeto = totalCuotaRepercutida - totalCuotaSoportada

  const porTrimestre: ResultadoModelo390['porTrimestre'] = []
  for (let i = 0; i < 4; i++) {
    const r = trimestres[i]
    if (!r) continue
    porTrimestre.push({
      trimestre: (i + 1) as 1 | 2 | 3 | 4,
      baseRepercutida: r.baseImponibleRepercutida + r.baseImponibleRepercutida10 + r.baseImponibleRepercutida4,
      cuotaRepercutida: r.totalCuotaRepercutida,
      baseSoportada: r.baseImponibleSoportada,
      cuotaSoportada: r.totalCuotaSoportada,
      resultado: r.resultadoLiquidacion,
    })
  }

  return {
    baseImponibleRepercutidaAnual,
    totalCuotaRepercutida,
    baseImponibleSoportadaAnual,
    totalCuotaSoportada,
    totalCompensaciones,
    totalAIngresar,
    totalADevolver,
    totalACompensar,
    resultadoNeto,
    esAIngresar: resultadoNeto >= 0,
    porTrimestre,
  }
}
