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
}

/**
 * Coeficientes máximos de reducción por años de tenencia (art. 107.4 TRLRHL, versión
 * establecida por RD-Ley 26/2021) según los años de permanencia del terreno.
 * Los ayuntamientos pueden reducirlos hasta 4 puntos porcentuales.
 */
const COEFICIENTES: Record<number, number> = {
  1: 0.6,
  2: 0.58,
  3: 0.56,
  4: 0.54,
  5: 0.52,
  6: 0.5,
  7: 0.48,
  8: 0.46,
  9: 0.44,
  10: 0.42,
  11: 0.4,
  12: 0.39,
  13: 0.38,
  14: 0.37,
  15: 0.36,
  16: 0.35,
  17: 0.34,
  18: 0.33,
  19: 0.32,
  20: 0.31,
}

function coeficientePara(anyos: number): number {
  if (anyos < 1) return 0
  if (anyos > 20) return COEFICIENTES[20] ?? 0.31
  return COEFICIENTES[anyos] ?? 0.31
}

export function calcularPlusvaliaMunicipal(datos: DatosPlusvalia): ResultadoPlusvalia {
  const avisos: string[] = []
  const anyos = Math.max(0, Math.floor(datos.anyosTenencia))

  let baseImponible: number
  let detalle: string

  if (datos.metodo === 'objetivo') {
    // Base = (valor catastral del terreno) × coeficiente según años de tenencia
    const coef = coeficientePara(anyos)
    baseImponible = Math.max(0, datos.valorCatastralTerreno) * coef
    detalle = `Base objetiva = ${datos.valorCatastralTerreno.toLocaleString('es-ES')} € (valor catastral del terreno) × ${(coef * 100).toFixed(2)}% (coeficiente por ${anyos} año(s) de tenencia)`
    if (anyos < 1) {
      avisos.push('Con menos de 1 año de tenencia no se genera incremento de valor (no hay base imponible por el método objetivo).')
    }
  } else {
    const adq = Math.max(0, datos.valorAdquisicion ?? 0)
    const trans = Math.max(0, datos.valorTransmision ?? 0)
    const incremento = trans - adq
    // El contribuyente puede elegir la base: incremento real o base catastral objetiva
    const baseObjetiva = Math.max(0, datos.valorCatastralTerreno) * coeficientePara(anyos)
    baseImponible = Math.max(0, incremento)
    detalle = `Base por método real = ${(trans - adq).toLocaleString('es-ES')} € (transmisión ${trans.toLocaleString('es-ES')} € − adquisición ${adq.toLocaleString('es-ES')} €). Comparativa con base objetiva: ${baseObjetiva.toLocaleString('es-ES')} €. Si el incremento resultara inferior usarías la base objetiva (o la mayor que corresponda según tu ayuntamiento).`
    if (incremento <= 0) {
      avisos.push('No hay incremento de valor real: la cuota por este método es 0 €. El contribuyente puede alegar ausencia de plusvalía.')
    }
  }

  const tipoEfectivo = 100 * (datos.tipoMunicipal / 100)
  const cuota = baseImponible * (datos.tipoMunicipal / 100)

  return {
    metodo: datos.metodo,
    baseImponible,
    tipoEfectivo,
    cuota,
    anyosTenencia: anyos,
    detalle,
    avisos,
  }
}
