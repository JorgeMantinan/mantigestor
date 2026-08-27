/**
 * Modelo 220 — IS consolidación fiscal (grupos de sociedades)
 *
 * Declaración del impuesto sobre sociedades para entidades que tributan
 * en régimen de consolidación fiscal.
 */

export interface EntidadGrupo {
  nombre: string
  nif: string
  baseImponible: number
  cuotaIntegra: number
}

export interface DatosModelo220 {
  entidades: EntidadGrupo[]
  cuotaConsolidada: number
  pagosAnteriores: number
}

export interface ResultadoModelo220 {
  totalBaseImponible: number
  totalCuotaIntegra: number
  cuotaConsolidada: number
  resultado: number
  aPagar: number
  aDevolver: number
}

export function calcularModelo220(datos: DatosModelo220): ResultadoModelo220 {
  const totalBaseImponible = datos.entidades.reduce((sum, e) => sum + e.baseImponible, 0)
  const totalCuotaIntegra = datos.entidades.reduce((sum, e) => sum + e.cuotaIntegra, 0)
  const cuotaConsolidada = datos.cuotaConsolidada
  const resultado = cuotaConsolidada - datos.pagosAnteriores

  const aPagar = Math.max(0, resultado)
  const aDevolver = Math.max(0, -resultado)

  return {
    totalBaseImponible,
    totalCuotaIntegra,
    cuotaConsolidada,
    resultado,
    aPagar,
    aDevolver,
  }
}

function formatEUR(cents: number): string {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(cents / 100)
}
