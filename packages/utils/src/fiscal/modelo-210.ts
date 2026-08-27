/**
 * Modelo 210 — IRNR (Impuesto sobre la Renta de No Residentes)
 *
 * Tipo de retención según tipo de renta:
 * - Inmobiliaria: 24% (19% residentes UE/EEE)
 * - Mobiliaria: 19%
 * - Otros: 24%
 */

export type TipoRenta210 = 'inmobiliaria' | 'mobiliaria' | 'otros'

export interface DatosModelo210 {
  tipoRenta: TipoRenta210
  baseImponible: number
  retencion: number
  gastosDeducibles: number
  esResidenteUe?: boolean
}

export interface ResultadoModelo210 {
  baseImponible: number
  tipoRetencion: number
  cuotaIntegra: number
  resultado: number
}

function tipoRetencion(tipoRenta: TipoRenta210, esResidenteUe: boolean): number {
  if (tipoRenta === 'inmobiliaria') return esResidenteUe ? 19 : 24
  if (tipoRenta === 'mobiliaria') return 19
  return 24
}

export function calcularModelo210(datos: DatosModelo210): ResultadoModelo210 {
  const esUe = datos.esResidenteUe ?? false
  const tipo = tipoRetencion(datos.tipoRenta, esUe)
  const baseImponible = Math.max(0, datos.baseImponible - datos.gastosDeducibles)
  const cuotaIntegra = Math.round(baseImponible * tipo / 100)
  const resultado = cuotaIntegra - datos.retencion

  return {
    baseImponible,
    tipoRetencion: tipo,
    cuotaIntegra,
    resultado,
  }
}

function formatEUR(cents: number): string {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(cents / 100)
}

export const TIPOS_RENTA_210 = [
  { valor: 'inmobiliaria', label: 'Renta inmobiliaria' },
  { valor: 'mobiliaria', label: 'Renta mobiliaria' },
  { valor: 'otros', label: 'Otros rendimientos' },
] as const
