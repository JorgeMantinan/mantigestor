/**
 * Modelo 296 — Retenciones IRPF no residentes (resumen anual)
 *
 * Declaración-resumen anual de retenciones e ingresos a cuenta sobre
 * rendimientos del capital mobiliario y ganancias patrimoniales
 * obtenidos por no residentes.
 */

export interface RetencionNoResidente {
  nif: string
  nombre: string
  baseImponible: number
  retencion: number
  tipo: string
}

export interface DatosModelo296 {
  retenciones: RetencionNoResidente[]
}

export interface ResultadoModelo296 {
  totalBaseImponible: number
  totalRetenciones: number
  numSujetos: number
  baseMedia: number
  retencionMedia: number
}

export function calcularModelo296(datos: DatosModelo296): ResultadoModelo296 {
  const totalBaseImponible = datos.retenciones.reduce((sum, r) => sum + r.baseImponible, 0)
  const totalRetenciones = datos.retenciones.reduce((sum, r) => sum + r.retencion, 0)
  const numSujetos = datos.retenciones.length
  const baseMedia = numSujetos > 0 ? Math.round(totalBaseImponible / numSujetos) : 0
  const retencionMedia = numSujetos > 0 ? Math.round(totalRetenciones / numSujetos) : 0

  return {
    totalBaseImponible,
    totalRetenciones,
    numSujetos,
    baseMedia,
    retencionMedia,
  }
}

function formatEUR(cents: number): string {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(cents / 100)
}

export const TIPOS_RENTA_296 = [
  'Dividendos',
  'Intereses',
  'Royalties',
  'Otros rendimientos',
] as const
