/**
 * Modelo 151 — Declaración del IRPF del régimen especial aplicable a los
 * trabajadores, profesionales, emprendedores e inversores desplazados a
 * territorio español («Ley Beckham», art. 93 LIRPF).
 *
 * Aprobado por la Orden HFP/1338/2023 (BOE 15-12-2023) para ejercicios 2023 y
 * siguientes (sustituye al de la Orden HAP/2783/2015). Comunica además la opción
 * con el modelo 149.
 *
 * Tipos oficiales (cuadro AEAT de tipos de retención y manual IRPF, c15):
 * - Base general (trabajo, profesionales, alquileres de fuente española):
 *   24 % hasta 600.000 € de rendimientos y 47 % sobre el exceso (mismo pagador).
 * - Sin mínimos personales ni deducciones del régimen general: tipo fijo.
 * - Se deducen los pagos a cuenta (retenciones y pagos fraccionados).
 */

export const LIMITE_TIPO_REDUCIDO_BECKHAM_CENTS = 60_000_000 // 600.000 €
export const TIPO_GENERAL_BECKHAM = 24
export const TIPO_EXCESO_BECKHAM = 47

export interface DatosModelo151 {
  /** Rendimientos de trabajo, actividades profesionales y alquileres de fuente española (céntimos) */
  rendimientosBaseGeneralCents: number
  /** Retenciones y pagos a cuenta ya practicados (céntimos) */
  pagosACuentaCents: number
}

export interface ResultadoModelo151 {
  rendimientosBaseGeneralCents: number
  /** Rendimientos que tributan al 24 % (hasta 600.000 €) */
  baseHastaLimiteCents: number
  /** Exceso por encima de 600.000 € que tributa al 47 % */
  baseExcesoCents: number
  cuotaHastaLimiteCents: number
  cuotaExcesoCents: number
  cuotaIntegraCents: number
  pagosACuentaCents: number
  /** Positivo = a ingresar; negativo = a devolver */
  resultadoCents: number
}

export function calcularModelo151(datos: DatosModelo151): ResultadoModelo151 {
  const rendimientos = Math.max(0, datos.rendimientosBaseGeneralCents)
  const pagosACuenta = Math.max(0, datos.pagosACuentaCents)

  const baseHastaLimiteCents = Math.min(rendimientos, LIMITE_TIPO_REDUCIDO_BECKHAM_CENTS)
  const baseExcesoCents = Math.max(0, rendimientos - LIMITE_TIPO_REDUCIDO_BECKHAM_CENTS)

  const cuotaHastaLimiteCents = Math.round(baseHastaLimiteCents * (TIPO_GENERAL_BECKHAM / 100))
  const cuotaExcesoCents = Math.round(baseExcesoCents * (TIPO_EXCESO_BECKHAM / 100))
  const cuotaIntegraCents = cuotaHastaLimiteCents + cuotaExcesoCents

  return {
    rendimientosBaseGeneralCents: rendimientos,
    baseHastaLimiteCents,
    baseExcesoCents,
    cuotaHastaLimiteCents,
    cuotaExcesoCents,
    cuotaIntegraCents,
    pagosACuentaCents: pagosACuenta,
    resultadoCents: cuotaIntegraCents - pagosACuenta,
  }
}
