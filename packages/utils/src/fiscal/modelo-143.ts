/**
 * Modelo 143 — Solicitud de abono anticipado de la deducción por familia
 * numerosa, por ascendiente con dos hijos o por personas con discapacidad a cargo.
 *
 * Aprobado en la Ley 35/2006 (arts. 68.2 y 81.bis LIRPF) y gestionado por la AEAT
 * (procedimiento G613). Se presenta ante el pagador (modalidad individual) o ante
 * la AEAT (modalidad colectiva, ingreso directo).
 *
 * Cuantías (año natural completo):
 * - Familia numerosa categoría general: 1.200 € (100 €/mes)
 * - Familia numerosa categoría especial: 2.400 € (200 €/mes)
 * - Ascendiente separado legalmente o sin vínculo con dos hijos: 1.200 € (100 €/mes)
 * - Personas con discapacidad (≥ 33 %) a cargo o el propio contribuyente: 1.200 € (100 €/mes)
 * Acumulables entre sí cuando concurren distintos derechos.
 */

export type Concepto143 =
  | 'familiaNumerosaGeneral'
  | 'familiaNumerosaEspecial'
  | 'ascendienteDosHijos'
  | 'discapacidad'

export const CUANTIAS_143: Record<Concepto143, { anualCents: number; mensualCents: number; etiqueta: string }> = {
  familiaNumerosaGeneral: { anualCents: 120_000, mensualCents: 10_000, etiqueta: 'Familia numerosa (general)' },
  familiaNumerosaEspecial: { anualCents: 240_000, mensualCents: 20_000, etiqueta: 'Familia numerosa (especial)' },
  ascendienteDosHijos: { anualCents: 120_000, mensualCents: 10_000, etiqueta: 'Ascendiente con dos hijos' },
  discapacidad: { anualCents: 120_000, mensualCents: 10_000, etiqueta: 'Discapacidad (≥ 33 %) a cargo' },
}

export interface DatosModelo143 {
  concepto: Concepto143
  /** 'individual' = lo abona el pagador; 'colectiva' = lo ingresa la AEAT */
  modo: 'individual' | 'colectiva'
  /** Meses de abono en el año (1-12); por defecto 12 */
  meses?: number
}

export interface ResultadoModelo143 {
  concepto: Concepto143
  etiqueta: string
  modo: 'individual' | 'colectiva'
  mensualCents: number
  anualCents: number
  /** Abono estimado en el año según los meses indicados */
  abonoEstimadoCents: number
  meses: number
}

export function calcularModelo143(datos: DatosModelo143): ResultadoModelo143 {
  const cuantia = CUANTIAS_143[datos.concepto] ?? CUANTIAS_143.familiaNumerosaGeneral
  const meses = Math.min(12, Math.max(1, datos.meses ?? 12))

  return {
    concepto: datos.concepto,
    etiqueta: cuantia.etiqueta,
    modo: datos.modo,
    mensualCents: cuantia.mensualCents,
    anualCents: cuantia.anualCents,
    abonoEstimadoCents: cuantia.mensualCents * meses,
    meses,
  }
}
