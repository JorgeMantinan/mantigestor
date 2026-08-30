import { describe, it, expect } from 'vitest'
import { calcularModelo216 } from '../modelo-216'

describe('calcularModelo216 — retenciones no residentes', () => {
  it('devuelve ceros y observación con array vacío', () => {
    const r = calcularModelo216({
      trimestre: 1,
      ejercicio: 2026,
      retenciones: [],
    })
    expect(r.totalRentas).toBe(0)
    expect(r.totalRetenciones).toBe(0)
    expect(r.numBeneficiarios).toBe(0)
    expect(r.observaciones.some((o) => o.includes('No se han declarado perceptores'))).toBe(true)
  })

  it('calcula retención de 24% sobre un no residente', () => {
    const r = calcularModelo216({
      trimestre: 2,
      ejercicio: 2026,
      retenciones: [
        {
          nifBeneficiario: 'X1234567A',
          nombreBeneficiario: 'John Smith',
          paisResidencia: 'GB',
          rentasCents: 100_000,
          tipoRetencionPct: 24,
          retencionPracticadaCents: 24_000,
        },
      ],
    })
    expect(r.totalRentas).toBe(100_000)
    expect(r.totalRetenciones).toBe(24_000)
    expect(r.numBeneficiarios).toBe(1)
    expect(r.paisesRepresentados).toBe(1)
  })

  it('calcula la retención automáticamente si no se indica', () => {
    const r = calcularModelo216({
      trimestre: 1,
      ejercicio: 2026,
      retenciones: [
        {
          nifBeneficiario: 'Y9876543B',
          nombreBeneficiario: 'Marie Dupont',
          paisResidencia: 'FR',
          rentasCents: 50_000,
          tipoRetencionPct: 15,
          retencionPracticadaCents: 0,
        },
      ],
    })
    expect(r.totalRetenciones).toBe(7_500)
  })

  it('acumula múltiples perceptores de distintos países', () => {
    const r = calcularModelo216({
      trimestre: 3,
      ejercicio: 2026,
      retenciones: [
        {
          nifBeneficiario: 'X1111111A',
          nombreBeneficiario: 'John Doe',
          paisResidencia: 'GB',
          rentasCents: 100_000,
          tipoRetencionPct: 24,
          retencionPracticadaCents: 24_000,
        },
        {
          nifBeneficiario: 'Y2222222B',
          nombreBeneficiario: 'Marie Curie',
          paisResidencia: 'FR',
          rentasCents: 80_000,
          tipoRetencionPct: 15,
          retencionPracticadaCents: 12_000,
        },
      ],
    })
    expect(r.totalRentas).toBe(180_000)
    expect(r.totalRetenciones).toBe(36_000)
    expect(r.numBeneficiarios).toBe(2)
    expect(r.paisesRepresentados).toBe(2)
    expect(r.rentaMedia).toBe(90_000)
  })

  it('avisa cuando se aplican tipos de retención distintos', () => {
    const r = calcularModelo216({
      trimestre: 4,
      ejercicio: 2026,
      retenciones: [
        {
          nifBeneficiario: 'X1111111A',
          nombreBeneficiario: 'John',
          paisResidencia: 'GB',
          rentasCents: 50_000,
          tipoRetencionPct: 24,
          retencionPracticadaCents: 12_000,
        },
        {
          nifBeneficiario: 'Y2222222B',
          nombreBeneficiario: 'Anna',
          paisResidencia: 'DE',
          rentasCents: 50_000,
          tipoRetencionPct: 15,
          retencionPracticadaCents: 7_500,
        },
      ],
    })
    expect(r.observaciones.some((o) => o.includes('tipos de retención diferentes'))).toBe(true)
  })
})
