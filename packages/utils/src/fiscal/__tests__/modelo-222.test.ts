import { describe, it, expect } from 'vitest'
import { calcularModelo222 } from '../modelo-222'

describe('calcularModelo222 — pago fraccionado sociedades (grandes/grupos)', () => {
  it('modalidad base para gran empresa aplica 24%', () => {
    const r = calcularModelo222({
      modalidad: 'base',
      baseImponibleCents: 1_000_000, // 10.000 €
      cuotaIntegraAnteriorCents: 0,
      cifraNegocios: 15_000_000,
      pagosAnterioresCents: 0,
    })
    expect(r.tipoPorcentaje).toBe(24)
    expect(r.pagoFraccionadoCents).toBe(240_000) // 2.400 €
  })

  it('modalidad base con cifra menor aplica 18%', () => {
    const r = calcularModelo222({
      modalidad: 'base',
      baseImponibleCents: 1_000_000,
      cuotaIntegraAnteriorCents: 0,
      cifraNegocios: 5_000_000,
      pagosAnterioresCents: 0,
    })
    expect(r.tipoPorcentaje).toBe(18)
    expect(r.pagoFraccionadoCents).toBe(180_000)
  })

  it('modalidad cuota usa el 18% sobre la cuota del ejercicio anterior', () => {
    const r = calcularModelo222({
      modalidad: 'cuota',
      baseImponibleCents: 0,
      cuotaIntegraAnteriorCents: 2_000_000, // 20.000 €
      cifraNegocios: 3_000_000,
      pagosAnterioresCents: 0,
    })
    expect(r.tipoAplicable).toContain('Cuota del ejercicio anterior (18%)')
    expect(r.pagoFraccionadoCents).toBe(360_000) // 18% de 20.000 = 3.600 €
  })

  it('resta los pagos anteriores del total a pagar', () => {
    const r = calcularModelo222({
      modalidad: 'base',
      baseImponibleCents: 1_000_000,
      cuotaIntegraAnteriorCents: 0,
      cifraNegocios: 12_000_000,
      pagosAnterioresCents: 100_000,
    })
    expect(r.totalAPagarCents).toBe(140_000) // 240.000 - 100.000
  })

  it('avisa cuando no corresponde el 222 (ni gran empresa ni grupo)', () => {
    const r = calcularModelo222({
      modalidad: 'base',
      baseImponibleCents: 1_000_000,
      cuotaIntegraAnteriorCents: 0,
      cifraNegocios: 3_000_000,
      esGrupoConsolidacion: false,
      pagosAnterioresCents: 0,
    })
    expect(r.avisos.some((a) => a.includes('modelo 202'))).toBe(true)
  })
})
