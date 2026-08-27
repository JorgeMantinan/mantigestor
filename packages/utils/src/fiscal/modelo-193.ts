/**
 * Modelo 193 — Retenciones e ingresos a cuenta sobre seguros
 * Declaración informativa de retenciones e ingresos a cuenta sobre rendimientos
 * del capital mobiliario derivados de operaciones de seguros.
 * Obligatorio para aseguradoras que paguen rendimientos del capital mobiliario
 * (intereses, dividendos, etc.) sometidos a retención.
 */

export interface RetencionSeguro {
  aseguradoNif: string
  aseguradoNombre: string
  tipoRendimiento: 'intereses' | 'dividendos' | 'otro'
  baseRetencion: number
  tipoRetencion: number
  retencionPracticada: number
}

export interface DatosModelo193 {
  ejercicio: number
  retenciones: RetencionSeguro[]
}

export interface ResultadoModelo193 {
  numAsegurados: number
  totalBaseRetencion: number
  totalRetenciones: number
  porTipoRendimiento: Record<string, { numAsegurados: number; base: number; retencion: number }>
  resumen: string
}

const LABELS_RENDIMIENTO: Record<RetencionSeguro['tipoRendimiento'], string> = {
  intereses: 'Intereses',
  dividendos: 'Dividendos',
  otro: 'Otros',
}

export function calcularModelo193(datos: DatosModelo193): ResultadoModelo193 {
  const { retenciones } = datos

  const porTipoRendimiento: Record<string, { numAsegurados: number; base: number; retencion: number }> = {}
  let totalBaseRetencion = 0
  let totalRetenciones = 0

  for (const r of retenciones) {
    totalBaseRetencion += r.baseRetencion
    totalRetenciones += r.retencionPracticada

    const label = LABELS_RENDIMIENTO[r.tipoRendimiento]
    const entry = porTipoRendimiento[label] ?? { numAsegurados: 0, base: 0, retencion: 0 }
    entry.numAsegurados++
    entry.base += r.baseRetencion
    entry.retencion += r.retencionPracticada
    porTipoRendimiento[label] = entry
  }

  const numAsegurados = retenciones.length

  const resumen = numAsegurados > 0
    ? `${numAsegurados} asegurado(s) · Base total: ${formatEUR(totalBaseRetencion)} · Retenciones: ${formatEUR(totalRetenciones)}`
    : 'Sin retenciones de seguros registradas'

  return {
    numAsegurados,
    totalBaseRetencion,
    totalRetenciones,
    porTipoRendimiento,
    resumen,
  }
}

function formatEUR(cents: number): string {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(cents / 100)
}
