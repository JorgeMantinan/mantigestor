/**
 * Modelo 211 — Declaración de retenciones IRNR (no residentes) por adquisición de bienes inmuebles.
 *
 * Quien adquiere un inmueble a un vendedor no residente sin establecimiento permanente debe
 * retener el 3% de la consideración (art. 25.2 LIRNR) e ingresarlo mediante el modelo 211,
 * entregando al vendedor el importe neto. Este módulo calcula la retención y el neto.
 */

export interface DatosModelo211 {
  /** Precio total de la transmisión (consideración) (€) */
  precioVenta: number
  /** Tipo de retención en % (3% por defecto) */
  tipoRetencionPct?: number
  /** true si el adquirente asegura el pago a Hacienda (exención de retención) */
  conEsperaCauta?: boolean
}

export interface ResultadoModelo211 {
  precioVenta: number
  tipoRetencionPct: number
  retencion: number
  netoAlVendedor: number
  importeAingresar: number
  retencionAplicable: boolean
  avisos: string[]
}

export const TIPO_RETENCION_IRNR_INMUEBLES = 3

export function calcularModelo211(datos: DatosModelo211): ResultadoModelo211 {
  const avisos: string[] = []
  const tipoRetencionPct = datos.tipoRetencionPct ?? TIPO_RETENCION_IRNR_INMUEBLES
  const retencionAplicable = !datos.conEsperaCauta

  const retencion = retencionAplicable ? (datos.precioVenta * tipoRetencionPct) / 100 : 0
  const netoAlVendedor = Math.max(0, datos.precioVenta - retencion)
  const importeAingresar = retencion

  if (datos.conEsperaCauta) {
    avisos.push('Con espera cauta declarada (art. 25.2 LIRNR), el adquirente no debe retener ni presentar el 211.')
  }

  return {
    precioVenta: datos.precioVenta,
    tipoRetencionPct,
    retencion,
    netoAlVendedor,
    importeAingresar,
    retencionAplicable,
    avisos,
  }
}
