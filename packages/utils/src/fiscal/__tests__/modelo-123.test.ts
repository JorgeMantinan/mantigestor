import { describe, it, expect } from 'vitest'
import { calcularModelo123, tipoRetencionCapitalMobiliario } from '../modelo-123'

describe('tipoRetencionCapitalMobiliario (escala art. 25.1 LIRPF)', () => {
  it('19% hasta 6.000 € en intereses y dividendos', () => {
    expect(tipoRetencionCapitalMobiliario(500_000, 'intereses')).toBe(19)
    expect(tipoRetencionCapitalMobiliario(600_000, 'dividendos')).toBe(19)
  })

  it('21% entre 6.000 y 50.000 €', () => {
    expect(tipoRetencionCapitalMobiliario(2_000_000, 'intereses')).toBe(21)
    expect(tipoRetencionCapitalMobiliario(3_000_000, 'dividendos')).toBe(21)
  })

  it('23% por encima de 50.000 €', () => {
    expect(tipoRetencionCapitalMobiliario(10_000_000, 'intereses')).toBe(23)
  })

  it('otros conceptos usan siempre el 19% general', () => {
    expect(tipoRetencionCapitalMobiliario(500_000, 'otros')).toBe(19)
    expect(tipoRetencionCapitalMobiliario(10_000_000, 'otros')).toBe(19)
  })
})

describe('calcularModelo123 — retenciones capital mobiliario', () => {
  it('acumula base y retenciones por concepto', () => {
    const r = calcularModelo123({
      conceptos: [
        { tipo: 'intereses', baseImponible: 100_000, retencionPct: 19 },
        { tipo: 'dividendos', baseImponible: 200_000, retencionPct: 21 },
      ],
      trimestre: 1,
    })
    expect(r.totalBase).toBe(300_000)
    expect(r.totalRetenciones).toBe(19_000 + 42_000)
    expect(r.desglose[0]?.retencion).toBe(19_000)
    expect(r.desglose[1]?.retencion).toBe(42_000)
    expect(r.trimestre).toBe(1)
  })
})
