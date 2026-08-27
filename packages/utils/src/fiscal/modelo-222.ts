/**
 * Modelo 222 — Pago fraccionado del Impuesto sobre Sociedades (grandes empresas y grupos).
 *
 * A diferencia del 202 (entidades en estimación directa individual), el 222 se utiliza por:
 *  - entidades que tributan en el régimen de grupos de consolidación fiscal, y
 *  - entidades que, por su cifra de negocios (≥ 10 M€), deben usar la modalidad de base.
 *
 * Tipos de la modalidad de base (art. 40.3 LIS): 18% (general), 21% y 25% según el tipo de
 * entidad; 24% para entidades con cifra de negocios ≥ 10 M€ (en la base sobre el resultado
 * del periodo). La modalidad de cuota aplica el 18% sobre la cuota íntegra del ejercicio anterior.
 */

export type Modalidad222 = 'base' | 'cuota'

export interface DatosModelo222 {
  modalidad: Modalidad222
  /** Base imponible / resultado del periodo acumulado (céntimos) — modalidad base */
  baseImponibleCents: number
  /** Cuota íntegra del ejercicio anterior (céntimos) — modalidad cuota */
  cuotaIntegraAnteriorCents: number
  /** Cifra de negocios del ejercicio anterior (€) */
  cifraNegocios: number
  /** true si forma parte de un grupo de consolidación fiscal */
  esGrupoConsolidacion?: boolean
  /** Pagos fraccionados ya ingresados en el periodo (céntimos) */
  pagosAnterioresCents: number
}

export interface ResultadoModelo222 {
  modalidad: Modalidad222
  tipoAplicable: string
  tipoPorcentaje: number
  baseCalculoCents: number
  pagoFraccionadoCents: number
  pagosAnterioresCents: number
  totalAPagarCents: number
  avisos: string[]
}

function tipoParaCifra(cifra: number): number {
  if (cifra >= 10_000_000) return 24 // grandes empresas: 24% sobre base
  return 18 // resto: 18%
}

export function calcularModelo222(datos: DatosModelo222): ResultadoModelo222 {
  const avisos: string[] = []
  const tipoPorcentaje = tipoParaCifra(datos.cifraNegocios)

  let baseCalculoCents: number
  let tipoAplicable: string

  if (datos.modalidad === 'base') {
    baseCalculoCents = datos.baseImponibleCents
    tipoAplicable =
      datos.cifraNegocios >= 10_000_000
        ? `Base (24% — cifra de negocios ≥ 10 M€)`
        : `Base (18% — cifra de negocios < 10 M€)`
  } else {
    baseCalculoCents = datos.cuotaIntegraAnteriorCents
    tipoAplicable = 'Cuota del ejercicio anterior (18%)'
  }

  const pagoFraccionadoCents = Math.round(baseCalculoCents * (tipoPorcentaje / 100))
  const totalAPagarCents = Math.max(0, pagoFraccionadoCents - datos.pagosAnterioresCents)

  if (!datos.esGrupoConsolidacion && datos.cifraNegocios < 10_000_000) {
    avisos.push('Con cifra de negocios < 10 M€ y sin ser grupo de consolidación, normalmente el pago fraccionado se presenta con el modelo 202, no el 222.')
  }

  return {
    modalidad: datos.modalidad,
    tipoAplicable,
    tipoPorcentaje,
    baseCalculoCents,
    pagoFraccionadoCents,
    pagosAnterioresCents: datos.pagosAnterioresCents,
    totalAPagarCents,
    avisos,
  }
}
