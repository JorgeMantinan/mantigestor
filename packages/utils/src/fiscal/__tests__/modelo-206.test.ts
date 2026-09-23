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

  it('genera 4 trimestres con cuota proporcional (Q1/Q2=18%, Q3/Q4=17%)', () => {
    const r = calcularModelo206({
      baseImponibleCents: 1_000_000,
      tipoGravamenPct: 18,
      pagosAnterioresCents: 0,
      compensacionesPendientesCents: 0,
    })
    expect(r.trimestres).toHaveLength(4)
    expect(r.trimestres[0]!.cuotaIntegraCents).toBe(180_000)
    expect(r.trimestres[0]!.tipoPct).toBe(18)
    expect(r.trimestres[1]!.cuotaIntegraCents).toBe(180_000)
    expect(r.trimestres[1]!.tipoPct).toBe(18)
    expect(r.trimestres[2]!.cuotaIntegraCents).toBe(170_000)
    expect(r.trimestres[2]!.tipoPct).toBe(17)
    expect(r.trimestres[3]!.cuotaIntegraCents).toBe(170_000)
    expect(r.trimestres[3]!.tipoPct).toBe(17)
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
