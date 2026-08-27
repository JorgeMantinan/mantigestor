/**
 * Modelo 309 — IVA simplificado (declaración-liquidación periódica)
 *
 * Para sujetos pasivos de IVA simplificado que no disponen de sede electrónica.
 * Misma lógica base que el 303 pero simplificada.
 */

export interface DatosModelo309 {
  baseImponible21: number
  baseImponible10: number
  baseImponible4: number
  cuotaDevengada21: number
  cuotaDevengada10: number
  cuotaDevengada4: number
  deducciones: number
}

export interface ResultadoModelo309 {
  cuotaDevengada: number
  deducciones: number
  cuotaLiquida: number
  aIngresar: number
  aDevolver: number
}

export function calcularModelo309(datos: DatosModelo309): ResultadoModelo309 {
  const cuotaDevengada = datos.cuotaDevengada21 + datos.cuotaDevengada10 + datos.cuotaDevengada4
  const cuotaLiquida = cuotaDevengada - datos.deducciones

  const aIngresar = Math.max(0, cuotaLiquida)
  const aDevolver = Math.max(0, -cuotaLiquida)

  return {
    cuotaDevengada,
    deducciones: datos.deducciones,
    cuotaLiquida,
    aIngresar,
    aDevolver,
  }
}

function formatEUR(cents: number): string {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(cents / 100)
}
