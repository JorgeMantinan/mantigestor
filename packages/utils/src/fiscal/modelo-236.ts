/**
 * Modelo 236 — Declaración de información de la utilización en España de
 * determinados mecanismos transfronterizos de planificación fiscal (DAC6).
 *
 * Aprobado por la Orden HAC/342/2021 (BOE 13-4-2021). Lo presentan los
 * obligados tributarios que UTILIZAN en España mecanismos transfronterizos que
 * hubieron de ser previamente declarados (DA 23.1.c LGT), no los intermediarios
 * (que declaran con el 234).
 *
 * Plazo: durante el ÚLTIMO TRIMESTRE del año natural siguiente a aquel en que se
 * produjo la utilización (art. 49.3 del RGAT — RD 1065/2007).
 * Contenido: identificación del mecanismo, fechas de la primera acción vinculante,
 * estados miembros afectados, si es la primera declaración y si es comercializable.
 */

export interface Mecanismo236 {
  /** Descripción o resumen del mecanismo */
  descripcion: string
  /** Fecha de utilización en España (ISO, YYYY-MM-DD) */
  fechaUtilizacion: string
  /** Estados miembros afectados (p. ej. «España; Alemania») */
  estadosAfectados: string
  /** ¿Es la primera declaración del mecanismo? */
  primeraDeclaracion: boolean
  /** ¿Mecanismo comercializable? */
  comercializable: boolean
}

export interface DatosModelo236 {
  /** Ejercicio en el que se utilizó el mecanismo */
  anyoUtilizacion: number
  mecanismos: Mecanismo236[]
}

export interface ResultadoModelo236 {
  numMecanismos: number
  /** Plazo oficial (último trimestre del año siguiente a la utilización) */
  plazo: string
  /** Ejercicio en el que corresponde presentar (año de utilización + 1) */
  anyoPresentacion: number
  numPrimeraDeclaracion: number
  numComercializables: number
  avisos: string[]
}

export function calcularModelo236(datos: DatosModelo236): ResultadoModelo236 {
  const avisos: string[] = []
  let numPrimeraDeclaracion = 0
  let numComercializables = 0

  for (const m of datos.mecanismos) {
    const fecha = new Date(m.fechaUtilizacion)
    if (Number.isNaN(fecha.getTime())) {
      avisos.push(`Fecha de utilización no válida en «${m.descripcion}».`)
    } else if (fecha.getFullYear() !== datos.anyoUtilizacion) {
      avisos.push(`«${m.descripcion}» se utilizó fuera del ejercicio indicado.`)
    }
    if (m.primeraDeclaracion) numPrimeraDeclaracion += 1
    if (m.comercializable) numComercializables += 1
    if (!m.estadosAfectados.trim()) {
      avisos.push(`Indica los estados miembros afectados en «${m.descripcion}».`)
    }
  }

  return {
    numMecanismos: datos.mecanismos.length,
    plazo: `Último trimestre de ${datos.anyoUtilizacion + 1} (octubre-diciembre)`,
    anyoPresentacion: datos.anyoUtilizacion + 1,
    numPrimeraDeclaracion,
    numComercializables,
    avisos,
  }
}
