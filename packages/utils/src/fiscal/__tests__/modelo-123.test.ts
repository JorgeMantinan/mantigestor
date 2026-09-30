import { describe, it, expect } from 'vitest'
import { calcularModelo123, tipoRetencionCapitalMobiliario } from '../modelo-123'

describe('tipoRetencionCapitalMobiliario — 19 % fijo (art. 101.4 LIRPF)', () => {
  it('aplica el 19% a intereses y dividendos por cualquier importe', () => {
    expect(tipoRetencionCapitalMobiliario(500_000, 'intereses')).toBe(19)
    expect(tipoRetencionCapitalMobiliario(600_000, 'dividendos')).toBe(19)
    expect(tipoRetencionCapitalMobiliario(2_000_000, 'intereses')).toBe(19)
    expect(tipoRetencionCapitalMobiliario(3_000_000, 'dividendos')).toBe(19)
    expect(tipoRetencionCapitalMobiliario(10_000_000, 'intereses')).toBe(19)
    expect(tipoRetencionCapitalMobiliario(10_000_000, 'dividendos')).toBe(19)
  })

  it('otros conceptos de capital mobiliario también retienen al 19%', () => {
    expect(tipoRetencionCapitalMobiliario(500_000, 'otros')).toBe(19)
    expect(tipoRetencionCapitalMobiliario(10_000_000, 'otros')).toBe(19)
  })
})

describe('calcularModelo123', () => {
  it('suma bases y retenciones del trimestre', () => {
    const r = calcularModelo123({
      trimestre: 2,
      conceptos: [
        { tipo: 'dividendos', baseImponible: 100_000, retencionPct: 19 },
        { tipo: 'intereses', baseImponible: 50_000, retencionPct: 19 },
      ],
    })
    expect(r.totalBase).toBe(150_000)
    expect(r.totalRetenciones).toBe(28_500) // 19% de 150.000
    expect(r.desglose).toHaveLength(2)
    expect(r.trimestre).toBe(2)
  })

  it('sin conceptos devuelve cero', () => {
    const r = calcularModelo123({ trimestre: 1, conceptos: [] })
    expect(r.totalBase).toBe(0)
    expect(r.totalRetenciones).toBe(0)
  })
})
