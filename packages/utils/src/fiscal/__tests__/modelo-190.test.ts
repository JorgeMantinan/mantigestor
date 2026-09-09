import { describe, it, expect } from 'vitest'
import { calcularModelo190, type RendimientoRetencion190 } from '../modelo-190'

function rendimiento(overrides: Partial<RendimientoRetencion190>): RendimientoRetencion190 {
  return {
    tipo: 'profesional',
    descripcion: 'Consultoría',
    nifPagador: 'B12345678',
    brutoCents: 100_000,
    tipoRetencionPct: 15,
    retencionCents: 15_000,
    ...overrides,
  }
}

describe('calcularModelo190', () => {
  it('clasifica rendimientos y cuenta pagadores únicos', () => {
    const res = calcularModelo190([
      rendimiento({ tipo: 'trabajo', nifPagador: 'A11111111', brutoCents: 200_000, retencionCents: 30_000 }),
      rendimiento({ tipo: 'trabajo', nifPagador: 'A22222222', brutoCents: 100_000, retencionCents: 15_000 }),
      rendimiento({ tipo: 'profesional', nifPagador: 'B12345678', brutoCents: 150_000, retencionCents: 22_500 }),
    ])

    expect(res.trabajoBruto).toBe(300_000)
    expect(res.trabajoRetenciones).toBe(45_000)
    expect(res.numPagadoresTrabajo).toBe(2)
    expect(res.profesionalBruto).toBe(150_000)
    expect(res.profesionalRetenciones).toBe(22_500)
    expect(res.numPagadoresProfesional).toBe(1)
    expect(res.totalBruto).toBe(450_000)
    expect(res.totalRetenciones).toBe(67_500)
    expect(res.totalPagadores).toBe(3)
  })

  it('deduplica pagadores con mismo NIF', () => {
    const res = calcularModelo190([
      rendimiento({ tipo: 'trabajo', nifPagador: 'A11111111', brutoCents: 100_000, retencionCents: 15_000 }),
      rendimiento({ tipo: 'trabajo', nifPagador: 'A11111111', brutoCents: 50_000, retencionCents: 7_500 }),
    ])

    expect(res.numPagadoresTrabajo).toBe(1)
    expect(res.trabajoBruto).toBe(150_000)
    expect(res.trabajoRetenciones).toBe(22_500)
  })

  it('calcula retención desde tipoRetencionPct si retencionCents es 0', () => {
    const res = calcularModelo190([
      rendimiento({ tipo: 'otros', nifPagador: 'C99999999', brutoCents: 200_000, tipoRetencionPct: 19, retencionCents: 0 }),
    ])

    expect(res.otrosRetenciones).toBe(38_000)
  })

  it('sin rendimientos devuelve todo a cero', () => {
    const res = calcularModelo190([])

    expect(res.totalBruto).toBe(0)
    expect(res.totalRetenciones).toBe(0)
    expect(res.totalPagadores).toBe(0)
  })

  it('múltiples tipos acumulan por separado', () => {
    const res = calcularModelo190([
      rendimiento({ tipo: 'trabajo', nifPagador: 'A11111111', brutoCents: 100_000, retencionCents: 15_000 }),
      rendimiento({ tipo: 'arrendamiento', nifPagador: 'D11111111', brutoCents: 80_000, retencionCents: 15_200 }),
      rendimiento({ tipo: 'otros', nifPagador: 'E11111111', brutoCents: 50_000, retencionCents: 9_500 }),
    ])

    expect(res.arrendamientoBruto).toBe(80_000)
    expect(res.arrendamientoRetenciones).toBe(15_200)
    expect(res.numPagadoresArrendamiento).toBe(1)
    expect(res.otrosBruto).toBe(50_000)
    expect(res.otrosRetenciones).toBe(9_500)
    expect(res.numPagadoresOtros).toBe(1)
  })
})
