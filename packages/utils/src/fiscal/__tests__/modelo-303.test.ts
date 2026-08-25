import { describe, it, expect } from 'vitest'
import { calcularModelo303, resultadosIvaAnuales, type FacturaFiscalMinima } from '../modelo-303'

function factura(overrides: Partial<FacturaFiscalMinima>): FacturaFiscalMinima {
  return {
    tipo: 'ingreso',
    importe: 1000,
    iva: 21,
    importeIva: 210,
    deducible: true,
    ...overrides,
  }
}

describe('calcularModelo303 con compensación', () => {
  it('trimestre negativo en Q1 genera saldo a compensar', () => {
    const res = calcularModelo303(
      [factura({ tipo: 'gasto', importeIva: 210 })],
      1
    )
    expect(res.aCompensar).toBe(210)
    expect(res.saldoPendienteCompensar).toBe(-210)
    expect(res.aDevolver).toBe(0)
  })

  it('el saldo negativo mina el resultado positivo del trimestre siguiente', () => {
    const gastos = [factura({ tipo: 'gasto', importeIva: 210 })]
    const ingresos = [factura({ importe: 2000, importeIva: 420 })]

    const q1 = calcularModelo303(gastos, 1)
    const q2 = calcularModelo303(ingresos, 2, q1.saldoPendienteCompensar)

    expect(q2.compensacionAplicada).toBe(210)
    expect(q2.resultadoLiquidacion).toBe(210)
    expect(q2.aIngresar).toBe(210)
  })

  it('la compensación no puede convertir el resultado en positivo', () => {
    // bruto = 100, pendiente = -500 → compensación usada limitada a 100
    const ingresos = [factura({ importeIva: 100 })]
    const res = calcularModelo303(ingresos, 2, -500)
    expect(res.compensacionAplicada).toBe(100)
    expect(res.aIngresar).toBe(0)
    expect(res.saldoPendienteCompensar).toBe(-400)
    expect(res.aCompensar).toBe(400)
  })

  it('en el cuarto trimestre el saldo negativo se devuelve, no se compensa', () => {
    const res = calcularModelo303([], 4, -300)
    expect(res.aDevolver).toBe(300)
    expect(res.aCompensar).toBe(0)
    expect(res.saldoPendienteCompensar).toBe(0)
  })

  it('sin compensación pendiente mantiene el comportamiento clásico', () => {
    const res = calcularModelo303([factura({ iva: 10, importeIva: 50 })], 3)
    expect(res.aIngresar).toBe(50)
    expect(res.cuotaRepercutida10).toBe(50)
    expect(res.compensacionAplicada).toBe(0)
  })
})

describe('resultadosIvaAnuales', () => {
  it('arrastra compensaciones y devuelve en el 4T', () => {
    const gastoQ1 = [factura({ tipo: 'gasto', importeIva: 210 })]
    const ingresoQ2 = [factura({ importe: 2000, importeIva: 420 })]
    const gastoQ4 = [factura({ tipo: 'gasto', importeIva: 210 })]

    const [q1, q2, , q4] = resultadosIvaAnuales([gastoQ1, ingresoQ2, [], gastoQ4])

    expect(q1?.aCompensar).toBe(210)
    expect(q2?.aIngresar).toBe(210)
    expect(q2?.saldoPendienteCompensar).toBe(0)
    expect(q4?.aDevolver).toBe(210)
  })
})
