import { describe, it, expect } from 'vitest'
import { calcularModelo347, type OperacionTercero } from '../modelo-347'

function operacion(overrides: Partial<OperacionTercero>): OperacionTercero {
  return {
    tercero: 'Proveedor A',
    nif: 'B12345678',
    importeTotal: 100_000,
    importeCompra: 50_000,
    importeVenta: 50_000,
    operacionInmueble: false,
    operacionSeguros: false,
    cantidadesPendientes: 0,
    ...overrides,
  }
}

describe('calcularModelo347', () => {
  it('no es obligatorio si ningún tercero supera el umbral', () => {
    const res = calcularModelo347({
      operaciones: [
        operacion({ tercero: 'Proveedor A', nif: 'B11111111', importeTotal: 200_000 }),
        operacion({ tercero: 'Cliente B', nif: 'B22222222', importeTotal: 100_000 }),
      ],
    })

    expect(res.obligatorio).toBe(false)
    expect(res.numTerceros).toBe(0)
    expect(res.totalCompras).toBe(100_000)
    expect(res.totalVentas).toBe(100_000)
  })

  it('es obligatorio si un tercero supera 3.005,06€', () => {
    const res = calcularModelo347({
      operaciones: [
        operacion({ tercero: 'Proveedor Grande', nif: 'B99999999', importeTotal: 400_000, importeCompra: 400_000 }),
        operacion({ tercero: 'Cliente Pequeño', nif: 'B11111111', importeTotal: 50_000, importeVenta: 50_000 }),
      ],
    })

    expect(res.obligatorio).toBe(true)
    expect(res.numTerceros).toBe(1)
    expect(res.terceroPorOperaciones['Proveedor Grande (B99999999)']).toBe(400_000)
  })

  it('agrupa operaciones del mismo tercero', () => {
    const res = calcularModelo347({
      operaciones: [
        operacion({ tercero: 'Proveedor X', nif: 'B11111111', importeTotal: 200_000 }),
        operacion({ tercero: 'Proveedor X', nif: 'B11111111', importeTotal: 150_000 }),
      ],
    })

    expect(res.terceroPorOperaciones['Proveedor X (B11111111)']).toBe(350_000)
  })

  it('sin operaciones devuelve todo a cero', () => {
    const res = calcularModelo347({ operaciones: [] })

    expect(res.numTerceros).toBe(0)
    expect(res.totalCompras).toBe(0)
    expect(res.totalVentas).toBe(0)
    expect(res.obligatorio).toBe(false)
  })

  it('suma totalCompras y totalVentas correctamente', () => {
    const res = calcularModelo347({
      operaciones: [
        operacion({ importeCompra: 100_000, importeVenta: 50_000 }),
        operacion({ importeCompra: 80_000, importeVenta: 120_000 }),
      ],
    })

    expect(res.totalCompras).toBe(180_000)
    expect(res.totalVentas).toBe(170_000)
  })

  it('múltiples terceros obligatorios se cuentan todos', () => {
    const res = calcularModelo347({
      operaciones: [
        operacion({ tercero: 'A', nif: 'B11111111', importeTotal: 400_000 }),
        operacion({ tercero: 'B', nif: 'B22222222', importeTotal: 400_000 }),
        operacion({ tercero: 'C', nif: 'B33333333', importeTotal: 10_000 }),
      ],
    })

    expect(res.numTerceros).toBe(2)
    expect(res.obligatorio).toBe(true)
  })
})
