/**
 * Plusvalía municipal (IIVTNU) — Impuesto sobre el Incremento de Valor de los Terrenos de Naturaleza Urbana.
 *
 * Lo gestiona cada ayuntamiento (no hay un nº de modelo único; cada municipio tiene su ordenanza).
 * Desde la STC 59/2017 conviven dos métodos de cálculo: el objetivo (sobre valor catastral y años de
 * tenencia) y el real (sobre la plusvalía obtenida en la transmisión y el tipo municipal).
 */

export type MetodoPlusvalia = 'objetivo' | 'real'

export interface DatosPlusvalia {
  /** Valor catastral del terreno en el momento de la transmisión (€) */
  valorCatastralTerreno: number
  /** Años completos de tenencia del inmueble */
  anyosTenencia: number
  /** Tipo impositivo del ayuntamiento (%, p.ej. 30) */
  tipoMunicipal: number
  /** Método de cálculo */
  metodo: MetodoPlusvalia
  /** Valor de adquisición (solo método real) */
  valorAdquisicion?: number
  /** Valor de transmisión (solo método real) */
  valorTransmision?: number
}

export interface ResultadoPlusvalia {
  metodo: MetodoPlusvalia
  baseImponible: number
  tipoEfectivo: number
  cuota: number
  anyosTenencia: number
  /** Explicación de cómo se ha calculado la base */
  detalle: string
  avisos: string[]
  /** Método que resultaría más favorable para el contribuyente */
  metodoFavorable: MetodoPlusvalia
  /** Base por el método objetivo (usado para comparar) */
  baseObjetiva: number
  /** Base por el método real (incremento), si procede */
  baseReal: number
  /** Cuota del método más favorable (la cuota mínima posible) */
  cuotaMinima: number
}

/**
 * Coeficientes MÁXIMOS del método objetivo (art. 107.4 TRLHL) vigentes para
 * transmisiones con efectos desde el 1 de enero de 2026, fijados por el
 * Real Decreto-ley 16/2025, de 23 de diciembre (BOE-A-2025-26458). Se actualizan
 * anualmente mediante norma con rango de ley (Leyes de Presupuestos / RDL).
 * El ayuntamiento puede aprobar en su ordenanza coeficientes IGUALES O MENORES.
 */
const COEFICIENTES: Record<number, number> = {
  1: 0.15,
  2: 0.15,
  3: 0.15,
  4: 0.16,
  5: 0.18,
  6: 0.2,
  7: 0.22,
  8: 0.23,
  9: 0.21,
  10: 0.16,
  11: 0.13,
  12: 0.11,
  13: 0.1,
  14: 0.1,
  15: 0.1,
  16: 0.1,
  17: 0.12,
  18: 0.16,
  19: 0.22,
  20: 0.35,
}

/** Periodos inferiores a 1 año (gravables desde el RD-Ley 26/2021) */
const COEFICIENTE_MENOR_UN_ANIO = 0.16

function coeficientePara(anyos: number): number {
  if (anyos < 1) return COEFICIENTE_MENOR_UN_ANIO
  if (anyos > 20) return COEFICIENTES[20] ?? 0.35
  return COEFICIENTES[anyos] ?? 0.35
}

export function calcularPlusvaliaMunicipal(datos: DatosPlusvalia): ResultadoPlusvalia {
  const avisos: string[] = []
  const anyos = Math.max(0, Math.floor(datos.anyosTenencia))

  // Base por el método objetivo (siempre calculable)
  const coef = coeficientePara(anyos)
  const baseObjetiva = Math.max(0, datos.valorCatastralTerreno) * coef

  // Base por el método real (incremento de valor)
  const adq = Math.max(0, datos.valorAdquisicion ?? 0)
  const trans = Math.max(0, datos.valorTransmision ?? 0)
  const baseReal = Math.max(0, trans - adq)

  // Método más favorable: el de menor base imponible
  const metodoFavorable: MetodoPlusvalia =
    baseObjetiva <= baseReal ? 'objetivo' : 'real'

  let baseImponible: number
  let detalle: string

  if (datos.metodo === 'objetivo') {
    baseImponible = baseObjetiva
    detalle = `Base objetiva = ${datos.valorCatastralTerreno.toLocaleString('es-ES')} € (valor catastral del terreno) × ${(coef * 100).toFixed(2)}% (coeficiente por ${anyos} año(s) de tenencia)`
    if (anyos < 1) {
      avisos.push('Períodos de generación inferiores a 1 año: se aplica el coeficiente máximo de 0,16 (art. 107.4 TRLHL, vigente desde 1-1-2026).')
    }
    if (trans > 0 && adq > 0) {
      if (baseReal < baseObjetiva) {
        detalle += ` El método real (plusvalía ${baseReal.toLocaleString('es-ES')} €) resulta MÁS FAVORABLE que el objetivo: conviene elegirlo si es admisible según tu ayuntamiento.`
      }
    } else {
      avisos.push('Aporta los valores de adquisición y transmisión para comparar con el método real y elegir la opción más favorable.')
    }
  } else {
    const incremento = trans - adq
    baseImponible = baseReal
    detalle = `Base por método real = ${(trans - adq).toLocaleString('es-ES')} € (transmisión ${trans.toLocaleString('es-ES')} € − adquisición ${adq.toLocaleString('es-ES')} €). Comparativa con base objetiva: ${baseObjetiva.toLocaleString('es-ES')} €.`
    if (incremento <= 0) {
      avisos.push('No hay incremento de valor real: la cuota por este método es 0 €. El contribuyente puede alegar ausencia de plusvalía.')
    } else if (baseObjetiva < baseReal) {
      detalle += ` La base objetiva (${baseObjetiva.toLocaleString('es-ES')} €) resulta MÁS FAVORABLE: conviene elegirla si es admisible según tu ayuntamiento.`
    }
  }

  const tipoEfectivo = 100 * (datos.tipoMunicipal / 100)
  const cuota = baseImponible * (datos.tipoMunicipal / 100)
  const cuotaMinima = Math.min(baseObjetiva, baseReal) * (datos.tipoMunicipal / 100)

  return {
    metodo: datos.metodo,
    baseImponible,
    tipoEfectivo,
    cuota,
    anyosTenencia: anyos,
    detalle,
    avisos,
    metodoFavorable,
    baseObjetiva,
    baseReal,
    cuotaMinima,
  }
}
