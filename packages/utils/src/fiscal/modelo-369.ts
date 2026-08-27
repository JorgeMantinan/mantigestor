/**
 * Modelo 369 — IVA en un solo estado miembro (OSS)
 * Declaración-liquidación del IVA para vendedores a distancia y otros sujetos
 * pasivos que apliquen el régimen de un solo estado miembro (OSS).
 * Sustituye a las declaraciones-liquidaciones mensuales/trimestrales
 * para operaciones intracomunitarias B2C bajo el régimen OSS.
 */

export interface VentaOSS {
  paisDestino: string
  baseImponible: number
  tipoIva: number
  cuotaIva: number
}

export interface DatosModelo369 {
  ejercicio: number
  trimestre: 1 | 2 | 3 | 4
  ventas: VentaOSS[]
}

export interface ResultadoModelo369 {
  numPaises: number
  totalBaseImponible: number
  totalCuotaIva: number
  ventasPorPais: Record<string, { base: number; cuota: number }>
  resumen: string
}

const TIPOS_OSS: Record<string, number> = {
  'Alemania': 19,
  'Austria': 20,
  'Bélgica': 21,
  'Bulgaria': 20,
  'Chequia': 21,
  'Chipre': 19,
  'Croacia': 25,
  'Dinamarca': 25,
  'Eslovaquia': 20,
  'Eslovenia': 22,
  'Estonia': 22,
  'Finlandia': 24,
  'Francia': 20,
  'Grecia': 24,
  'Hungría': 27,
  'Irlanda': 23,
  'Italia': 22,
  'Letonia': 21,
  'Lituania': 21,
  'Luxemburgo': 17,
  'Malta': 18,
  'Países Bajos': 21,
  'Polonia': 23,
  'Portugal': 23,
  'Rumanía': 19,
  'Suecia': 25,
}

export function calcularModelo369(datos: DatosModelo369): ResultadoModelo369 {
  const { ventas } = datos

  const ventasPorPais: Record<string, { base: number; cuota: number }> = {}
  let totalBaseImponible = 0
  let totalCuotaIva = 0

  for (const v of ventas) {
    const entry = ventasPorPais[v.paisDestino] ?? { base: 0, cuota: 0 }
    entry.base += v.baseImponible
    entry.cuota += v.cuotaIva
    ventasPorPais[v.paisDestino] = entry
    totalBaseImponible += v.baseImponible
    totalCuotaIva += v.cuotaIva
  }

  const numPaises = Object.keys(ventasPorPais).length

  const resumen = numPaises > 0
    ? `${numPaises} país(es) · Base: ${formatEUR(totalBaseImponible)} · Cuota IVA a ingresar: ${formatEUR(totalCuotaIva)}`
    : 'Sin ventas OSS registradas'

  return {
    numPaises,
    totalBaseImponible,
    totalCuotaIva,
    ventasPorPais,
    resumen,
  }
}

export function obtenerTipoIvaPais(pais: string): number {
  return TIPOS_OSS[pais] ?? 21
}

export const PAISES_OSS = Object.keys(TIPOS_OSS).sort()

function formatEUR(cents: number): string {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(cents / 100)
}
