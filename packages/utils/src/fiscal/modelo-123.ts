/**
 * Modelo 123 — Retenciones e ingresos a cuenta sobre rendimientos
 * del capital mobiliario y ganancias patrimoniales derivadas de
 * letras del Tesoro (trimestral/anual).
 *
 * Intereses: 19% (hasta 6.000€), 21% (6.000-50.000€), 23% (>50.000€)
 * Dividendos: 19% (hasta 6.000€), 21% (6.000-50.000€), 23% (>50.000€)
 *
 * Fuentes: Art. 75.1.c y 94.1 RIRPF, escala art. 25.1 LIRPF.
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

/** Determina el tipo de retención según la escala art. 25.1 LIRPF */
export function tipoRetencionCapitalMobiliario(baseImponibleCents: number, tipo: 'intereses' | 'dividendos' | 'otros'): number {
  // Para intereses y dividendos se aplica la escala progresiva
  // Para otros conceptos se usa el tipo general del 19%
  if (tipo === 'otros') return 19

  const baseEur = baseImponibleCents / 100
  if (baseEur <= 6_000) return 19
  if (baseEur <= 50_000) return 21
  return 23
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
