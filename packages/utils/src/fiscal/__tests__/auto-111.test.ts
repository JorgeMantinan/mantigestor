import { describe, it, expect } from 'vitest'
import { calcularModelo111, calcularRetencion, resumenAnualRetenciones111, type RendimientoRetencion } from '../modelo-111'

function rendimiento(overrides: Partial<RendimientoRetencion>): RendimientoRetencion {
  return {
    tipo: 'trabajo',
    descripcion: 'Empleado test',
    brutoCents: 100_000,
    tipoRetencionPct: 15,
    retencionCents: 15_000,
    ...overrides,
  }
}

describe('calcularModelo111 — datos válidos', () => {
  it('calcula retenciones de trabajo correctamente', () => {
    const res = calcularModelo111([
      rendimiento({ tipo: 'trabajo', brutoCents: 100_000, retencionCents: 15_000 }),
    ])
    expect(res.trabajoBruto).toBe(100_000)
    expect(res.trabajoRetenciones).toBe(15_000)
    expect(res.totalBruto).toBe(100_000)
    expect(res.totalRetenciones).toBe(15_000)
  })

  it('calcula retenciones de profesional', () => {
    const res = calcularModelo111([
      rendimiento({ tipo: 'profesional', brutoCents: 200_000, retencionCents: 30_000 }),
    ])
    expect(res.profesionalBruto).toBe(200_000)
    expect(res.profesionalRetenciones).toBe(30_000)
  })

  it('calcula retenciones de arrendamiento', () => {
    const res = calcularModelo111([
      rendimiento({ tipo: 'arrendamiento', brutoCents: 50_000, retencionCents: 9_500 }),
    ])
    expect(res.arrendamientoBruto).toBe(50_000)
    expect(res.arrendamientoRetenciones).toBe(9_500)
  })

  it('calcula otros rendimientos', () => {
    const res = calcularModelo111([
      rendimiento({ tipo: 'otros', brutoCents: 30_000, retencionCents: 5_700 }),
    ])
    expect(res.otrosBruto).toBe(30_000)
    expect(res.otrosRetenciones).toBe(5_700)
  })

  it('agrupa múltiples rendimientos del mismo tipo', () => {
    const res = calcularModelo111([
      rendimiento({ tipo: 'trabajo', brutoCents: 100_000, retencionCents: 15_000 }),
      rendimiento({ tipo: 'trabajo', brutoCents: 50_000, retencionCents: 7_500 }),
    ])
    expect(res.trabajoBruto).toBe(150_000)
    expect(res.trabajoRetenciones).toBe(22_500)
  })

  it('resta pagos anteriores de aIngresar', () => {
    const res = calcularModelo111(
      [rendimiento({ brutoCents: 100_000, retencionCents: 15_000 })],
      10_000
    )
    expect(res.aIngresar).toBe(5_000)
  })
})

describe('calcularModelo111 — datos vacíos', () => {
  it('sin rendimientos genera totales en 0', () => {
    const res = calcularModelo111([])
    expect(res.totalBruto).toBe(0)
    expect(res.totalRetenciones).toBe(0)
    expect(res.aIngresar).toBe(0)
  })
})

describe('calcularModelo111 — casos extremos', () => {
  it('pagos anteriores superiores a retenciones genera aIngresar 0', () => {
    const res = calcularModelo111(
      [rendimiento({ brutoCents: 100_000, retencionCents: 15_000 })],
      50_000
    )
    expect(res.aIngresar).toBe(0)
  })

  it('valores 0 no producen errores', () => {
    const res = calcularModelo111([
      rendimiento({ brutoCents: 0, retencionCents: 0 }),
    ])
    expect(res.totalBruto).toBe(0)
    expect(res.totalRetenciones).toBe(0)
  })

  it('valores muy grandes no producen NaN', () => {
    const res = calcularModelo111([
      rendimiento({ brutoCents: 1_000_000_000, retencionCents: 150_000_000 }),
    ])
    expect(Number.isFinite(res.totalBruto)).toBe(true)
    expect(Number.isFinite(res.totalRetenciones)).toBe(true)
  })
})

describe('calcularRetencion', () => {
  it('15% de 100.000 = 15.000', () => {
    expect(calcularRetencion(100_000, 15)).toBe(15_000)
  })

  it('19% de 50.000 = 9.500', () => {
    expect(calcularRetencion(50_000, 19)).toBe(9_500)
  })

  it('0% de cualquier cantidad = 0', () => {
    expect(calcularRetencion(100_000, 0)).toBe(0)
  })
})

describe('resumenAnualRetenciones111', () => {
  it('suma 4 trimestres correctamente', () => {
    const t = calcularModelo111([
      rendimiento({ tipo: 'trabajo', brutoCents: 100_000, retencionCents: 15_000 }),
    ])
    const res = resumenAnualRetenciones111([t, t, t, t])
    expect(res.totalTrabajoBruto).toBe(400_000)
    expect(res.totalTrabajoRetenciones).toBe(60_000)
    expect(res.totalBruto).toBe(400_000)
    expect(res.totalRetenciones).toBe(60_000)
  })
})
