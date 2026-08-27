import { describe, it, expect } from 'vitest'
import { calcularModelo600 } from '../modelo-600'

describe('calcularModelo600 — ITP/AJD', () => {
  it('aplica el 6% orientativo por defecto sobre el valor del bien', () => {
    const r = calcularModelo600({ valorBien: 200_000 })
    expect(r.tipoGravamen).toBe(6)
    expect(r.baseLiquidable).toBe(200_000)
    expect(r.cuota).toBe(12_000)
  })

  it('usa la base liquidable cuando es distinta del valor', () => {
    const r = calcularModelo600({ valorBien: 250_000, baseLiquidable: 180_000, tipoGravamenPct: 6 })
    expect(r.baseLiquidable).toBe(180_000)
    expect(r.cuota).toBe(10_800)
  })

  it('devuelve cuota cero con base cero', () => {
    const r = calcularModelo600({ valorBien: 0 })
    expect(r.cuota).toBe(0)
  })

  it('acepta un tipo configurable según la CCAA', () => {
    const r = calcularModelo600({ valorBien: 150_000, tipoGravamenPct: 8 })
    expect(r.tipoGravamen).toBe(8)
    expect(r.cuota).toBe(12_000)
  })

  it('conserva el valor del bien declarado', () => {
    const r = calcularModelo600({ valorBien: 300_000, baseLiquidable: 300_000 })
    expect(r.valorBien).toBe(300_000)
    expect(r.cuota).toBe(18_000)
  })
})