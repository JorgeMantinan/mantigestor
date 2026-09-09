import { describe, it, expect } from 'vitest'
import {
  calcularModelo111,
  calcularRetencion,
  resumenAnualRetenciones111,
  type RendimientoRetencion,
} from '../modelo-111'

function rendimiento(overrides: Partial<RendimientoRetencion>): RendimientoRetencion {
  return {
    tipo: 'profesional',
    descripcion: 'Consultoría',
    brutoCents: 100_000,
    tipoRetencionPct: 15,
    retencionCents: 15_000,
    ...overrides,
  }
}

describe('calcularModelo111', () => {
  it('clasifica rendimientos por tipo y suma bruto/retenciones', () => {
    const res = calcularModelo111([
      rendimiento({ tipo: 'trabajo', brutoCents: 200_000, retencionCents: 30_000 }),
      rendimiento({ tipo: 'profesional', brutoCents: 100_000, retencionCents: 15_000 }),
      rendimiento({ tipo: 'arrendamiento', brutoCents: 50_000, retencionCents: 9_500 }),
      rendimiento({ tipo: 'otros', brutoCents: 30_000, retencionCents: 4_500 }),
    ])

    expect(res.trabajoBruto).toBe(200_000)
    expect(res.trabajoRetenciones).toBe(30_000)
    expect(res.profesionalBruto).toBe(100_000)
    expect(res.profesionalRetenciones).toBe(15_000)
    expect(res.arrendamientoBruto).toBe(50_000)
    expect(res.arrendamientoRetenciones).toBe(9_500)
    expect(res.otrosBruto).toBe(30_000)
    expect(res.otrosRetenciones).toBe(4_500)
    expect(res.totalBruto).toBe(380_000)
    expect(res.totalRetenciones).toBe(59_000)
  })

  it('calcula retención desde tipoRetencionPct si retencionCents es 0', () => {
    const res = calcularModelo111([
      rendimiento({ tipo: 'profesional', brutoCents: 200_000, tipoRetencionPct: 15, retencionCents: 0 }),
    ])

    expect(res.profesionalRetenciones).toBe(30_000)
  })

  it('descuenta pagos anteriores del total a ingresar', () => {
    const res = calcularModelo111(
      [rendimiento({ tipo: 'trabajo', brutoCents: 100_000, retencionCents: 15_000 })],
      10_000
    )

    expect(res.aIngresar).toBe(5_000)
  })

  it('aIngresar no puede ser negativo', () => {
    const res = calcularModelo111(
      [rendimiento({ tipo: 'trabajo', brutoCents: 100_000, retencionCents: 15_000 })],
      50_000
    )

    expect(res.aIngresar).toBe(0)
  })

  it('sin rendimientos devuelve todo a cero', () => {
    const res = calcularModelo111([])

    expect(res.totalBruto).toBe(0)
    expect(res.totalRetenciones).toBe(0)
    expect(res.aIngresar).toBe(0)
  })

  it('múltiples rendimientos del mismo tipo se acumulan', () => {
    const res = calcularModelo111([
      rendimiento({ tipo: 'profesional', brutoCents: 100_000, retencionCents: 15_000 }),
      rendimiento({ tipo: 'profesional', brutoCents: 200_000, retencionCents: 30_000 }),
    ])

    expect(res.profesionalBruto).toBe(300_000)
    expect(res.profesionalRetenciones).toBe(45_000)
  })
})

describe('calcularRetencion', () => {
  it('calcula retención correctamente', () => {
    expect(calcularRetencion(100_000, 15)).toBe(15_000)
  })

  it('redondea al entero más cercano', () => {
    expect(calcularRetencion(100_000, 7)).toBe(7_000)
    expect(calcularRetencion(33_333, 15)).toBe(5_000)
  })

  it('retención 0% devuelve 0', () => {
    expect(calcularRetencion(100_000, 0)).toBe(0)
  })

  it('bruto 0 devuelve 0', () => {
    expect(calcularRetencion(0, 15)).toBe(0)
  })
})

describe('resumenAnualRetenciones111', () => {
  it('suma 4 trimestres correctamente', () => {
    const q1 = calcularModelo111([rendimiento({ tipo: 'trabajo', brutoCents: 100_000, retencionCents: 15_000 })])
    const q2 = calcularModelo111([rendimiento({ tipo: 'profesional', brutoCents: 200_000, retencionCents: 30_000 })])
    const q3 = calcularModelo111([])
    const q4 = calcularModelo111([rendimiento({ tipo: 'trabajo', brutoCents: 100_000, retencionCents: 15_000 })])

    const anual = resumenAnualRetenciones111([q1, q2, q3, q4])

    expect(anual.totalTrabajoBruto).toBe(200_000)
    expect(anual.totalTrabajoRetenciones).toBe(30_000)
    expect(anual.totalProfesionalBruto).toBe(200_000)
    expect(anual.totalProfesionalRetenciones).toBe(30_000)
    expect(anual.totalBruto).toBe(400_000)
    expect(anual.totalRetenciones).toBe(60_000)
  })

  it('sin trimestres devuelve todo a cero', () => {
    const anual = resumenAnualRetenciones111([])
    expect(anual.totalBruto).toBe(0)
    expect(anual.totalRetenciones).toBe(0)
  })
})
