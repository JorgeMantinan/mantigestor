/**
 * Modelo 117 — Retenciones e ingresos a cuenta (IRPF, IS e IRNR) sobre rentas
 * procedentes de la transmisión o reembolso de acciones o participaciones en
 * Instituciones de Inversión Colectiva (fondos de inversión y sociedades de
 * inversión) y de las transmisiones de derechos de suscripción.
 *
 * Autoliquidación trimestral (y resumen por el 190).
 * Tipo: 19 % sobre la ganancia patrimonial (art. 101.6 LIRPF). No se aplica
 * retención cuando no proceda computar ganancia (pérdida) — art. 94.1.a LIRPF.
 * Fuentes: Orden EHA/3435/2007 (aprobación), cuadro AEAT de tipos de retención,
 * art. 101.6 LIRPF y art. 190 del Reglamento del IRPF.
 */

export const TIPO_RETENCION_IIC = 19

export type Concepto117 = 'reembolso' | 'transmision' | 'derechosSuscripcion'

export interface Fila117 {
  concepto: Concepto117
  /** NIF de la entidad gestora / fondo / emisor */
  nif: string
  /** Descripción del fondo o valor */
  descripcion?: string
  /** Contraprestación recibida (valor de reembolso/transmisión) en céntimos */
  contraprestacionCents: number
  /** Coste de adquisición en céntimos (base para la ganancia; 0 si se ignora) */
  adquisicionCents: number
}

export interface DatosModelo117 {
  /** Trimestre (1-4) o 'anual' para el resumen del año */
  periodo: number | 'anual'
  filas: Fila117[]
}

export interface Fila117Resultado {
  concepto: Concepto117
  nif: string
  /** Base de la retención (ganancia o importe íntegro) en céntimos */
  base: number
  retencion: number
}

export interface ResultadoModelo117 {
  baseTotal: number
  retencionTotal: number
  detalle: Fila117Resultado[]
  avisos: string[]
}

export function calcularModelo117(datos: DatosModelo117): ResultadoModelo117 {
  const avisos: string[] = []
  const detalle: Fila117Resultado[] = []
  let baseTotal = 0
  let retencionTotal = 0

  for (const fila of datos.filas) {
    const contraprestacion = Math.max(0, fila.contraprestacionCents)
    const adquisicion = Math.max(0, fila.adquisicionCents)

    let base: number
    if (fila.concepto === 'derechosSuscripcion') {
      // Transmisión de derechos de suscripción: se retiene sobre el importe íntegro
      base = contraprestacion
    } else {
      // Transmisión o reembolso de acciones/participaciones de IIC: sobre la ganancia
      base = Math.max(0, contraprestacion - adquisicion)
      if (base === 0 && contraprestacion > 0) {
        avisos.push(`Sin ganancia patrimonial en ${fila.descripcion ?? fila.nif}: no procede retención (art. 94.1.a LIRPF).`)
      }
    }

    const retencion = Math.round(base * (TIPO_RETENCION_IIC / 100))
    baseTotal += base
    retencionTotal += retencion
    detalle.push({ concepto: fila.concepto, nif: fila.nif, base, retencion })
  }

  if (datos.periodo === 'anual') {
    avisos.push('El modelo 117 se presenta por trimestres; este total sirve para el resumen anual (modelo 190).')
  }

  return { baseTotal, retencionTotal, detalle, avisos }
}
