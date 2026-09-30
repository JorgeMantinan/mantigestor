/**
 * Modelo 309 — IVA. Declaración-liquidación NO PERIÓDICA.
 *
 * No es el régimen simplificado: se utiliza para liquidar operaciones que no
 * procede incluir en un 303/322 periódico y, sobre todo, para RECTIFICAR
 * autoliquidaciones del 303/322 ya presentadas (motivo + ejercicio/periodo de la
 * autoliquidación original).
 *
 * Plazo: el del periodo del modelo 303/322 a que se refiera (p. ej. el del cuarto
 * trimestre: hasta el 30 de enero del año siguiente).
 * Fuentes: art. 38 y disposiciones del Reglamento del IVA; ayuda técnica AEAT
 * (modelos 303/309).
 */

export type Motivo309 =
  | 'rectificativa303'
  | 'rectificativa322'
  | 'operacionNoPeriodica'
  | 'otro'

export const MOTIVOS_309: Record<Motivo309, string> = {
  rectificativa303: 'Rectificación de autoliquidación del modelo 303',
  rectificativa322: 'Rectificación de autoliquidación del modelo 322 (grupos)',
  operacionNoPeriodica: 'Operación no sujeta a autoliquidación periódica',
  otro: 'Otros supuestos',
}

export interface Liquidacion309 {
  /** Tipo impositivo en % (21, 10, 4, 0) */
  tipo: number
  /** Base imponible en céntimos (positiva = devengada; negativa = soportada) */
  baseCents: number
  /** Cuota en céntimos (se calcula si no se indica) */
  cuotaCents?: number
}

export interface DatosModelo309 {
  motivo: Motivo309
  /** Ejercicio de la autoliquidación que se rectifica (si aplica) */
  ejercicioOriginal?: number
  /** Periodo de la autoliquidación original: 'T1'-'T4' o 'M01'-'M12' */
  periodoOriginal?: string
  /** Operaciones de la liquidación */
  operaciones: Liquidacion309[]
  /** Deducciones/regularizaciones a practicar en la liquidación (céntimos) */
  deduccionesCents?: number
  /** Cuotas ya liquidadas en la autoliquidación original (céntimos, si rectificativa) */
  resultadoOriginalCents?: number
}

export interface ResultadoModelo309 {
  motivo: Motivo309
  etiquetaMotivo: string
  esRectificativa: boolean
  ejercicioOriginal: number | null
  periodoOriginal: string | null
  baseDevengadaCents: number
  cuotaDevengadaCents: number
  baseSoportadaCents: number
  cuotaSoportadaCents: number
  /** Cuota de la liquidación (devengada − soportada − deducciones) */
  liquidacionCents: number
  deduccionesCents: number
  /** Diferencia con la autoliquidación original (si rectificativa) */
  diferenciaCents: number
  /** Positivo = a ingresar; negativo = a devolver */
  resultadoCents: number
  avisos: string[]
}

export function calcularModelo309(datos: DatosModelo309): ResultadoModelo309 {
  const avisos: string[] = []
  let baseDevengadaCents = 0
  let cuotaDevengadaCents = 0
  let baseSoportadaCents = 0
  let cuotaSoportadaCents = 0

  for (const op of datos.operaciones) {
    const base = op.baseCents
    const cuota = op.cuotaCents ?? Math.round(base * (op.tipo / 100))
    if (base >= 0) {
      baseDevengadaCents += base
      cuotaDevengadaCents += cuota
    } else {
      baseSoportadaCents += Math.abs(base)
      cuotaSoportadaCents += Math.abs(cuota)
    }
  }

  const esRectificativa = datos.motivo === 'rectificativa303' || datos.motivo === 'rectificativa322'
  if (esRectificativa && (!datos.ejercicioOriginal || !datos.periodoOriginal)) {
    avisos.push('Indica el ejercicio y el periodo de la autoliquidación que se rectifica.')
  }

  const liquidacionCents = cuotaDevengadaCents - cuotaSoportadaCents - Math.max(0, datos.deduccionesCents ?? 0)
  const resultadoOriginalCents = Math.max(0, datos.resultadoOriginalCents ?? 0)
  const diferenciaCents = esRectificativa ? liquidacionCents - resultadoOriginalCents : 0
  const resultadoCents = esRectificativa ? diferenciaCents : liquidacionCents

  return {
    motivo: datos.motivo,
    etiquetaMotivo: MOTIVOS_309[datos.motivo] ?? MOTIVOS_309.otro,
    esRectificativa,
    ejercicioOriginal: datos.ejercicioOriginal ?? null,
    periodoOriginal: datos.periodoOriginal ?? null,
    baseDevengadaCents,
    cuotaDevengadaCents,
    baseSoportadaCents,
    cuotaSoportadaCents,
    liquidacionCents,
    deduccionesCents: Math.max(0, datos.deduccionesCents ?? 0),
    diferenciaCents,
    resultadoCents,
    avisos,
  }
}
