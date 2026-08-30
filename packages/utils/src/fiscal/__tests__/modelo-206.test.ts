import { describe, it, expect } from 'vitest'
import { calcularModelo206 } from '../modelo-206'

describe('calcularModelo206 — pagos fraccionados sociedades', () => {
  it('calcula cuota íntegra con tipo general 18%', () => {
    const r = calcularModelo206({
      baseImponibleCents: 1_000_000,
      tipoGravamenPct: 18,
      pagosAnterioresCents: 0,
      compensacionesPendientesCents: 0,
    })
    expect(r.tipoPorcentaje).toBe(18)
    expect(r.cuotaIntegraTotalCents).toBe(180_000)
  })

  it('aplica 24% cuando la cifra de negocios supera 6M€', () => {
    const r = calcularModelo206({
      baseImponibleCents: 1_000_000,
      tipoGravamenPct: 18,
      pagosAnterioresCents: 0,
      compensacionesPendientesCents: 0,
      cifraNegociosCents: 600_000_000,
    })
    expect(r.tipoPorcentaje).toBe(24)
    expect(r.cuotaIntegraTotalCents).toBe(240_000)
  })

  it('genera 4 trimestres con cuota proporcional', () => {
    const r = calcularModelo206({
      baseImponibleCents: 1_000_000,
      tipoGravamenPct: 18,
      pagosAnterioresCents: 0,
      compensacionesPendientesCents: 0,
    })
    expect(r.trimestres).toHaveLength(4)
    r.trimestres.forEach((t) => {
      expect(t.cuotaIntegraCents).toBe(180_000)
      expect(t.tipoPct).toBe(18)
    })
  })

  it('resta pagos anteriores del total a pagar', () => {
    const r = calcularModelo206({
      baseImponibleCents: 1_000_000,
      tipoGravamenPct: 18,
      pagosAnterioresCents: 100_000,
      compensacionesPendientesCents: 0,
    })
    expect(r.totalAPagarCents).toBe(80_000)
  })

  it('devuelve resultado negativo cuando pagos anteriores superan cuota', () => {
    const r = calcularModelo206({
      baseImponibleCents: 1_000_000,
      tipoGravamenPct: 18,
      pagosAnterioresCents: 200_000,
      compensacionesPendientesCents: 0,
    })
    expect(r.totalADevolverCents).toBe(20_000)
    expect(r.totalAPagarCents).toBe(0)
  })

  it('aplica compensaciones de bases negativas antes de calcular cuota', () => {
    const r = calcularModelo206({
      baseImponibleCents: 1_000_000,
      tipoGravamenPct: 18,
      pagosAnterioresCents: 0,
      compensacionesPendientesCents: 200_000,
    })
    expect(r.baseImponibleCents).toBe(800_000)
    expect(r.cuotaIntegraTotalCents).toBe(144_000)
  })
})
