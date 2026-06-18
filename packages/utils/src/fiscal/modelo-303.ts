import type { Factura } from '@mantigestor/types'

export interface ResultadoModelo303 {
  baseImponibleRepercutida: number
  cuotaRepercutida: number
  baseImponibleRepercutida10: number
  cuotaRepercutida10: number
  totalCuotaRepercutida: number
  baseImponibleSoportada: number
  totalCuotaSoportada: number
  resultadoLiquidacion: number
  aIngresar: number
  aDevolver: number
  aCompensar: number
}

export function calcularModelo303(
  facturas: Factura[],
  trimestre: 1 | 2 | 3 | 4
): ResultadoModelo303 {
  const ingresos = facturas.filter(f => f.tipo === 'ingreso')
  const gastos = facturas.filter(f => f.tipo === 'gasto' && f.deducible)

  const ingresos21 = ingresos.filter(f => f.iva === 21)
  const ingresos10 = ingresos.filter(f => f.iva === 10)

  const baseRepercutida = ingresos21.reduce((acc, f) => acc + f.importe, 0)
  const cuotaRepercutida = ingresos21.reduce((acc, f) => acc + f.importeIva, 0)
  const baseRepercutida10 = ingresos10.reduce((acc, f) => acc + f.importe, 0)
  const cuotaRepercutida10 = ingresos10.reduce((acc, f) => acc + f.importeIva, 0)
  const totalCuotaRepercutida = ingresos.reduce((acc, f) => acc + f.importeIva, 0)

  const baseSoportada = gastos.reduce((acc, f) => acc + f.importe, 0)
  const totalCuotaSoportada = gastos.reduce((acc, f) => acc + f.importeIva, 0)

  const resultado = totalCuotaRepercutida - totalCuotaSoportada

  const aIngresar = resultado > 0 ? resultado : 0
  const aDevolver = resultado < 0 && trimestre === 4 ? Math.abs(resultado) : 0
  const aCompensar = resultado < 0 && trimestre !== 4 ? Math.abs(resultado) : 0

  return {
    baseImponibleRepercutida: baseRepercutida,
    cuotaRepercutida,
    baseImponibleRepercutida10: baseRepercutida10,
    cuotaRepercutida10,
    totalCuotaRepercutida,
    baseImponibleSoportada: baseSoportada,
    totalCuotaSoportada,
    resultadoLiquidacion: resultado,
    aIngresar,
    aDevolver,
    aCompensar,
  }
}
