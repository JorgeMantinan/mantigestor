export interface DatosModelo170 {
  baseImponible: number
  tipoRetencionPct?: number
}

export interface ResultadoModelo170 {
  baseImponible: number
  tipoRetencion: number
  cuotaRetenida: number
}

/**
 * Modelo 170 — Retenciones e ingresos a cuenta agrupados/imputados a un solo perceptor
 * (art. 76 RIRPF). No confundir con el modelo 115 (arrendamiento de inmuebles urbanos, 19%).
 *
 * Tipos (cuadro AEAT de tipos de retención):
 * - 19%: resto de conceptos del art. 75.2.b RIRPF (arrendamiento de bienes muebles,
 *   asistencia técnica, resto de conceptos)
 * - 24%: cesión del derecho de explotación de derechos de imagen (art. 101.1/101.10 RIRPF)
 * - 7%: profesionales de nuevo inicio (año de inicio y los dos siguientes, art. 101.5.a LIRPF)
 */
export const TIPOS_RETENCION_MODELO_170 = {
  restoConceptos: 19,
  cesionImagen: 24,
  profesionalNuevoInicio: 7,
} as const

export function calcularModelo170(datos: DatosModelo170): ResultadoModelo170 {
  const tipoRetencion = datos.tipoRetencionPct ?? TIPOS_RETENCION_MODELO_170.restoConceptos
  const cuotaRetenida = datos.baseImponible * (tipoRetencion / 100)

  return {
    baseImponible: datos.baseImponible,
    tipoRetencion,
    cuotaRetenida,
  }
}