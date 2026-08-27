import { describe, it, expect } from 'vitest'
import { resultadosIvaAnuales, type FacturaFiscalMinima } from '../modelo-303'
import { calcularModelo390 } from '../modelo-390'

function factura(tipo: 'ingreso' | 'gasto', base: number, iva: number, deducible = true): FacturaFiscalMinima {
  return { tipo, importe: base, iva, importeIva: Math.round(base * (iva / 100)), deducible }
}

/** Construye las 4 liquidaciones trimestrales con el mismo patrón de ingresos/gastos por trimestre */
function secuenciaAnual(ingresosPorT: number[], gastosPorT: number[]): ReturnType<typeof resultadosIvaAnuales> {
  return resultadosIvaAnuales(
    ingresosPorT.map((ing, i) => {
      const filas: FacturaFiscalMinima[] = []
      if (ing > 0) filas.push(factura('ingreso', ing, 21))
      if (gastosPorT[i] !== undefined && gastosPorT[i] > 0) filas.push(factura('gasto', gastosPorT[i]!, 21))
      return filas
    })
  )
}

describe('calcularModelo390 — resumen anual IVA', () => {
  it('agrega los cuatro trimestres en totales anuales', () => {
    const trimestres = secuenciaAnual([10_000, 10_000, 10_000, 10_000], [2_000, 2_000, 2_000, 2_000])
    const r = calcularModelo390(trimestres)

    expect(r.totalCuotaRepercutida).toBe(4 * Math.round(10_000 * 0.21))
    expect(r.totalCuotaSoportada).toBe(4 * Math.round(2_000 * 0.21))
    expect(r.porTrimestre).toHaveLength(4)
    expect(r.baseImponibleRepercutidaAnual).toBe(4 * 10_000)
    expect(r.esAIngresar).toBe(true)
    expect(r.totalAIngresar).toBeGreaterThan(0)
  })

  it('refleja un año a devolver cuando los gastos superan a los ingresos', () => {
    const trimestres = secuenciaAnual([2_000, 2_000, 2_000, 2_000], [8_000, 8_000, 8_000, 8_000])
    const r = calcularModelo390(trimestres)
    expect(r.esAIngresar).toBe(false)
    expect(r.resultadoNeto).toBeLessThan(0)
  })

  it('absorbe la compensación intertrimestral dentro del mismo año', () => {
    // 1T negativo (solo gastos) queda a compensar
    const arr = resultadosIvaAnuales([
      [factura('gasto', 20_000, 21)],
      [factura('ingreso', 8_000, 21)],
      [factura('ingreso', 8_000, 21)],
      [factura('ingreso', 8_000, 21)],
    ])
    const r = calcularModelo390(arr)
    expect(r.totalCompensaciones).toBeGreaterThan(0)
    // El saldo negativo quedó compensado con ingresos de trimestres posteriores del mismo año:
    // el resultado anual debe ser positivo o neto favorable (el negativo se absorbió)
    expect(r.esAIngresar).toBe(true)
  })

  it('integra un saldo negativo acumulado de Q4 como devolución', () => {
    const arr = resultadosIvaAnuales([
      [factura('ingreso', 10_000, 21)],
      [factura('ingreso', 10_000, 21)],
      [factura('ingreso', 50_000, 21)],
      [factura('gasto', 30_000, 21), factura('ingreso', 1_000, 21)],
    ])
    const r = calcularModelo390(arr)
    // Los trimestres 1-3 son positivos; el Q4 con gran gasto genera devolución
    expect(r.totalADevolver).toBeGreaterThan(0)
  })
})
