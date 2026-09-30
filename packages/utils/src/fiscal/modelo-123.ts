/**
 * Modelo 123 — Retenciones e ingresos a cuenta sobre rendimientos
 * del capital mobiliario y ganancias patrimoniales derivadas de
 * letras del Tesoro (trimestral/anual).
 *
 * La retención sobre rendimientos del capital mobiliario es del 19 % fijo
 * (art. 101.4 LIRPF y cuadro AEAT de tipos de retención). La escala 19/21/23
 * es la escala de la BASE DEL AHORRO aplicable en la declaración, no en la retención.
 * Excepción: propiedad intelectual cuando el perceptor no es el autor → 15 %.
 *
 * Fuentes: art. 101.4 LIRPF, art. 76.1.b) y 100 RIRPF.
 */

export interface ConceptoCapitalMobiliario {
  /** Tipo de rendimiento */
  tipo: 'intereses' | 'dividendos' | 'otros'
  /** Base imponible: importe bruto satisfecho (céntimos) */
  baseImponible: number
  /** Tipo de retención aplicado (%) */
  retencionPct: number
}

export interface DatosModelo123 {
  conceptos: ConceptoCapitalMobiliario[]
  /** Trimestre del año (1-4) */
  trimestre: 1 | 2 | 3 | 4
}

export interface ResultadoModelo123 {
  /** Total base imponible */
  totalBase: number
  /** Total retenciones */
  totalRetenciones: number
  /** Trimestre declarado */
  trimestre: number
  /** Desglose por concepto */
  desglose: Array<{
    tipo: string
    baseImponible: number
    retencionPct: number
    retencion: number
  }>
}

/** Retención sobre capital mobiliario: 19 % fijo (no escala) — art. 101.4 LIRPF */
export function tipoRetencionCapitalMobiliario(baseImponibleCents: number, tipo: 'intereses' | 'dividendos' | 'otros'): number {
  void baseImponibleCents
  void tipo
  return 19
}

export function calcularModelo123(datos: DatosModelo123): ResultadoModelo123 {
  let totalBase = 0
  let totalRetenciones = 0

  const desglose = datos.conceptos.map(c => {
    const retencion = Math.round(c.baseImponible * (c.retencionPct / 100))
    totalBase += c.baseImponible
    totalRetenciones += retencion
    return {
      tipo: c.tipo,
      baseImponible: c.baseImponible,
      retencionPct: c.retencionPct,
      retencion,
    }
  })

  return {
    totalBase,
    totalRetenciones,
    trimestre: datos.trimestre,
    desglose,
  }
}
