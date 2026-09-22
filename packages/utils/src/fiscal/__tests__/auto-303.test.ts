import { describe, it, expect } from 'vitest'
import { calcularModelo303, type FacturaFiscalMinima } from '../modelo-303'

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

describe('auto-303: generación automática con deducible', () => {
  it('factura de gasto deducible reduce IVA soportado', () => {
    const res = calcularModelo303(
      [factura({ tipo: 'gasto', importeIva: 210, deducible: true })],
      1
    )
    expect(res.totalCuotaSoportada).toBe(210)
    expect(res.aCompensar).toBe(210)
  })

  it('factura de gasto no deducible no reduce IVA soportado', () => {
    const res = calcularModelo303(
      [factura({ tipo: 'gasto', importeIva: 210, deducible: false })],
      1
    )
    expect(res.totalCuotaSoportada).toBe(0)
    expect(res.aCompensar).toBe(0)
  })

  it('deducible undefined se trata como no deducible (requiere true explícito)', () => {
    const res = calcularModelo303(
      [factura({ tipo: 'gasto', importeIva: 210, deducible: undefined })],
      1
    )
    expect(res.totalCuotaSoportada).toBe(0)
  })

  it('mezcla de gastos deducibles y no deducibles', () => {
    const res = calcularModelo303(
      [
        factura({ tipo: 'gasto', importeIva: 210, deducible: true }),
        factura({ tipo: 'gasto', importeIva: 100, deducible: false }),
      ],
      1
    )
    expect(res.totalCuotaSoportada).toBe(210)
  })
})

describe('auto-303: estructura de salida', () => {
  it('resultado contiene todos los campos requeridos', () => {
    const res = calcularModelo303(
      [factura({ importe: 2000, importeIva: 420 })],
      1
    )
    expect(res).toHaveProperty('baseImponibleRepercutida')
    expect(res).toHaveProperty('cuotaRepercutida')
    expect(res).toHaveProperty('totalCuotaRepercutida')
    expect(res).toHaveProperty('baseImponibleSoportada')
    expect(res).toHaveProperty('totalCuotaSoportada')
    expect(res).toHaveProperty('resultadoLiquidacion')
    expect(res).toHaveProperty('aIngresar')
    expect(res).toHaveProperty('aCompensar')
    expect(res).toHaveProperty('aDevolver')
  })

  it('trimestre válido (1-4)', () => {
    const f = [factura({ importeIva: 100 })]
    for (let q = 1; q <= 4; q++) {
      const res = calcularModelo303(f, q as 1 | 2 | 3 | 4)
      expect(res.resultadoLiquidacion).toBeDefined()
    }
  })
})

describe('auto-303: casos extremos', () => {
  it('sin facturas genera resultado 0', () => {
    const res = calcularModelo303([], 1)
    expect(res.totalCuotaRepercutida).toBe(0)
    expect(res.totalCuotaSoportada).toBe(0)
    expect(res.aIngresar).toBe(0)
  })

  it('valores 0 en base e IVA', () => {
    const res = calcularModelo303(
      [factura({ importe: 0, importeIva: 0, iva: 0 })],
      1
    )
    expect(res.totalCuotaRepercutida).toBe(0)
  })

  it('IVAs variados (21%, 10%, 4%, 0%)', () => {
    const res = calcularModelo303(
      [
        factura({ importe: 1000, iva: 21, importeIva: 210 }),
        factura({ importe: 1000, iva: 10, importeIva: 100 }),
        factura({ importe: 1000, iva: 4, importeIva: 40 }),
        factura({ importe: 1000, iva: 0, importeIva: 0 }),
      ],
      1
    )
    expect(res.cuotaRepercutida).toBe(210)
    expect(res.cuotaRepercutida10).toBe(100)
    expect(res.cuotaRepercutida4).toBe(40)
  })
})
