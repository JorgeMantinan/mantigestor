/**
 * Modelo 117 — Retenciones e ingresos a cuenta de rentas derivadas de actividades agrícolas y ganaderas.
 *
 * Sustituyó al empleo parcial del 115 para ciertas rentas del sector primario (venta de madera, productos
 * lácteos en origen, cría de ganado, etc.). Declara la retención del 1% o del 2% según la procedencia de la
 * renta. Se presenta de forma trimestral y, al final del ejercicio, la declaración-resumen anual.
 */

export type TipoActividad117 =
  | 'ganadoOtro'
  | 'ganadoIbericoOriginario'
  | 'madera'
  | 'productosLacteosOrigen'
  | 'especie'
  | 'otras'

export interface Fila117 {
  tipo: TipoActividad117
  /** Importe bruto de la operación (€) */
  importe: number
  /** Tipo de retención aplicado (%) */
  tipoRetencion: number
}

export interface DatosModelo117 {
  /** Trimestre (1-4) o 'anual' para la resumen del año */
  periodo: number | 'anual'
  filas: Fila117[]
}

export interface ResultadoModelo117 {
  baseTotal: number
  retencionTotal: number
  detalle: Fila117Resultado[]
  avisos: string[]
}

export interface Fila117Resultado {
  tipo: TipoActividad117
  base: number
  retencion: number
}

// Tipo de retención orientativo por tipo de actividad
const TIPOS_REF: Record<TipoActividad117, number> = {
  ganadoOtro: 1,
  ganadoIbericoOriginario: 2,
  madera: 1,
  productosLacteosOrigen: 2,
  especie: 1,
  otras: 1,
}

export function calcularModelo117(datos: DatosModelo117): ResultadoModelo117 {
  const avisos: string[] = []
  const detalle: Fila117Resultado[] = []

  let baseTotal = 0
  let retencionTotal = 0

  for (const fila of datos.filas) {
    const importe = Math.max(0, fila.importe)
    const retencion = Math.round(importe * (fila.tipoRetencion / 100) * 100) / 100
    baseTotal += importe
    retencionTotal += retencion
    detalle.push({ tipo: fila.tipo, base: importe, retencion })
  }

  if (datos.periodo === 'anual') {
    avisos.push(
      'Resumen anual: la declaración-resumen del modelo 117 se presenta antes del 30 de enero del año siguiente.'
    )
  } else {
    avisos.push(
      'Declaración trimestral: ingreso durante los 20 primeros días del mes siguiente al trimestre (hasta el 20 de enero, abril, julio y octubre).'
    )
  }

  const tiposIncorrectos = datos.filas.filter(f => f.tipoRetencion > 0 && f.tipoRetencion !== TIPOS_REF[f.tipo])
  if (tiposIncorrectos.length > 0) {
    avisos.push(
      'El tipo habitual en actividades agrícolas/ganaderas es del 1% (o 2% para ganado ibérico originario y productos lácteos en origen). Revisa si el tipo indicado es el correcto.'
    )
  }

  return {
    baseTotal,
    retencionTotal,
    detalle,
    avisos,
  }
}
