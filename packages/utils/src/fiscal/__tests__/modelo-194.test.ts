import { describe, it, expect } from 'vitest'
import { calcularModelo194 } from '../modelo-194'

describe('calcularModelo194 — resumen anual retenciones', () => {
  it('devuelve ceros con todo a cero', () => {
    const r = calcularModelo194({
      r111: { baseCents: 0, retencionCents: 0 },
      r115: { baseCents: 0, retencionCents: 0 },
      r117: { baseCents: 0, retencionCents: 0 },
      r123: { baseCents: 0, retencionCents: 0 },
    })
    expect(r.totalBasesCents).toBe(0)
    expect(r.totalRetencionesCents).toBe(0)
    expect(r.numDeclaraciones).toBe(0)
    expect(r.desglosePorModelo).toHaveLength(4)
  })

  it('calcula un único tipo de retención (111)', () => {
    const r = calcularModelo194({
      r111: { baseCents: 100000, retencionCents: 21000 },
      r115: { baseCents: 0, retencionCents: 0 },
      r117: { baseCents: 0, retencionCents: 0 },
      r123: { baseCents: 0, retencionCents: 0 },
    })
    expect(r.totalBasesCents).toBe(100000)
    expect(r.totalRetencionesCents).toBe(21000)
    expect(r.numDeclaraciones).toBe(1)
  })

  it('suma múltiples tipos de retención (111, 115, 123)', () => {
    const r = calcularModelo194({
      r111: { baseCents: 50000, retencionCents: 10500 },
      r115: { baseCents: 80000, retencionCents: 16000 },
      r117: { baseCents: 0, retencionCents: 0 },
      r123: { baseCents: 30000, retencionCents: 6000 },
    })
    expect(r.totalBasesCents).toBe(160000)
    expect(r.totalRetencionesCents).toBe(32500)
    expect(r.numDeclaraciones).toBe(3)
  })

  it('incluye desglose por modelo con valores correctos', () => {
    const r = calcularModelo194({
      r111: { baseCents: 40000, retencionCents: 8400 },
      r115: { baseCents: 60000, retencionCents: 12000 },
      r117: { baseCents: 20000, retencionCents: 4400 },
      r123: { baseCents: 10000, retencionCents: 2000 },
    })
    expect(r.desglosePorModelo).toHaveLength(4)
    expect(r.desglosePorModelo.find((m) => m.modelo === '111')).toEqual({ modelo: '111', baseCents: 40000, retencionCents: 8400 })
    expect(r.desglosePorModelo.find((m) => m.modelo === '115')).toEqual({ modelo: '115', baseCents: 60000, retencionCents: 12000 })
    expect(r.desglosePorModelo.find((m) => m.modelo === '117')).toEqual({ modelo: '117', baseCents: 20000, retencionCents: 4400 })
    expect(r.desglosePorModelo.find((m) => m.modelo === '123')).toEqual({ modelo: '123', baseCents: 10000, retencionCents: 2000 })
    expect(r.totalBasesCents).toBe(130000)
    expect(r.totalRetencionesCents).toBe(26800)
    expect(r.numDeclaraciones).toBe(4)
  })
})
