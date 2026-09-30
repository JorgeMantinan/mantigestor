import { describe, it, expect } from 'vitest'
import { calcularModelo202 } from '../modelo-202'

describe('calcularModelo202 — modalidad cuota íntegra (art. 40.2)', () => {
  it('aplica el 18% sobre la cuota íntegra minorada', () => {
    const r = calcularModelo202({
      modalidad: 'cuota',
      entidad: 'general',
      cuotaIntegraUltimoPeriodoCents: 5_000_000, // 50.000 €
      baseImponiblePeriodoCents: 0,
      pagosAnterioresCents: 0,
    })
    expect(r.tipoPorcentaje).toBe(18)
    expect(r.pagoTrimestralCents).toBe(900_000) // 9.000 €
    expect(r.totalAnualEstimadoCents).toBe(2_700_000) // 3 plazos
  })
})

describe('calcularModelo202 — modalidad base (art. 40.3)', () => {
  it('INNCF < 10 M€ con tipo general: 5/7 × 25% → 17%', () => {
    const r = calcularModelo202({
      modalidad: 'base',
      entidad: 'general',
      cuotaIntegraUltimoPeriodoCents: 0,
      baseImponiblePeriodoCents: 1_000_000, // 10.000 €
      pagosAnterioresCents: 0,
    })
    expect(r.tipoPorcentaje).toBe(17)
    expect(r.pagoTrimestralCents).toBe(170_000)
  })

  it('INNCF ≥ 10 M€ con tipo general: 19/20 × 25% → 24%', () => {
    const r = calcularModelo202({
      modalidad: 'base',
      entidad: 'general',
      cifraNegocios10M: true,
      cuotaIntegraUltimoPeriodoCents: 0,
      baseImponiblePeriodoCents: 1_000_000,
      pagosAnterioresCents: 0,
    })
    expect(r.tipoPorcentaje).toBe(24)
    expect(r.pagoTrimestralCents).toBe(240_000)
  })

  it('entidad de reducida dimensión: 5/7 × 23% → 16%', () => {
    const r = calcularModelo202({
      modalidad: 'base',
      entidad: 'reducida',
      cuotaIntegraUltimoPeriodoCents: 0,
      baseImponiblePeriodoCents: 1_000_000,
      pagosAnterioresCents: 0,
    })
    expect(r.tipoPorcentaje).toBe(16)
  })

  it('micropyme: escala 19%/21% con los porcentajes de cada tramo', () => {
    const r = calcularModelo202({
      modalidad: 'base',
      entidad: 'micro',
      cuotaIntegraUltimoPeriodoCents: 0,
      baseImponiblePeriodoCents: 6_000_000, // 60.000 € → 50.000 + 10.000
      pagosAnterioresCents: 0,
    })
    // 5/7 × 19 → floor 13 ; 5/7 × 21 → floor 15
    // 50.000 € × 13% = 6.500 € + 10.000 € × 15% = 1.500 € → 8.000 €
    expect(r.pagoTrimestralCents).toBe(800_000)
    expect(r.tipoAplicable).toContain('13 %')
    expect(r.tipoAplicable).toContain('15 %')
  })

  it('resta los pagos fraccionados anteriores', () => {
    const r = calcularModelo202({
      modalidad: 'base',
      entidad: 'general',
      cuotaIntegraUltimoPeriodoCents: 0,
      baseImponiblePeriodoCents: 1_000_000,
      pagosAnterioresCents: 100_000,
    })
    expect(r.totalAPagarCents).toBe(70_000) // 170.000 − 100.000
  })
})
