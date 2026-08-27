/**
 * Modelo 347 — Declaración informativa de operaciones con terceros
 * Obligatorio si las operaciones con un tercero superan los 3.005,06€
 */

export interface OperacionTercero {
  tercero: string
  nif: string
  importeTotal: number
  importeCompra: number
  importeVenta: number
  operacionInmueble: boolean
  operacionSeguros: boolean
  cantidadesPendientes: number
}

export interface DatosModelo347 {
  operaciones: OperacionTercero[]
}

export interface ResultadoModelo347 {
  numTerceros: number
  totalCompras: number
  totalVentas: number
  terceroPorOperaciones: Record<string, number>
  obligatorio: boolean
  resumen: string
}

const UMBRAL = 300_506 // 3.005,06€

export function calcularModelo347(datos: DatosModelo347): ResultadoModelo347 {
  const { operaciones } = datos

  const terceroPorOperaciones: Record<string, number> = {}

  for (const op of operaciones) {
    const key = `${op.tercero} (${op.nif})`
    terceroPorOperaciones[key] = (terceroPorOperaciones[key] || 0) + op.importeTotal
  }

  const tercerosObligatorios = Object.entries(terceroPorOperaciones)
    .filter(([, total]) => total > UMBRAL)
    .map(([key]) => key)

  const totalCompras = operaciones.reduce((sum, op) => sum + op.importeCompra, 0)
  const totalVentas = operaciones.reduce((sum, op) => sum + op.importeVenta, 0)

  const numTerceros = tercerosObligatorios.length
  const obligatorio = numTerceros > 0

  const resumen = obligatorio
    ? `OBLIGATORIO: ${numTerceros} tercero(s) superan el umbral de ${formatEUR(UMBRAL)}`
    : `No obligatorio. Ningún tercero supera ${formatEUR(UMBRAL)}`

  return {
    numTerceros,
    totalCompras,
    totalVentas,
    terceroPorOperaciones,
    obligatorio,
    resumen,
  }
}

function formatEUR(cents: number): string {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(cents / 100)
}
