import { describe, it, expect } from 'vitest'
import { reduccionRendimientosTrabajoCents } from '../reduccion-trabajo'

describe('reduccionRendimientosTrabajoCents (art. 20 LIRPF, RDL 4/2024)', () => {
  it('aplica la cuota fija de 7.302 € hasta 14.852 €', () => {
    expect(reduccionRendimientosTrabajoCents(0)).toBe(730_200)
    expect(reduccionRendimientosTrabajoCents(1_485_200)).toBe(730_200)
  })

  it('es continua en el límite del segundo tramo', () => {
    const limite = reduccionRendimientosTrabajoCents(1_485_200)
    const siguiente = reduccionRendimientosTrabajoCents(1_485_201)
    expect(limite - siguiente).toBeLessThanOrEqual(2)
  })

  it('coincide con el valor de arranque del tercer tramo en 17.673,52 €', () => {
    expect(reduccionRendimientosTrabajoCents(1_767_352)).toBe(236_434)
  })

  it('reduce con pendiente 1,14 y llega a cero sin ser negativa', () => {
    // 20.000 € → 2.364,34 − 1,14 × (20.000 − 17.673,52) = −288,85 → 0
    expect(reduccionRendimientosTrabajoCents(2_000_000)).toBe(0)
    // 18.000 € → 2.364,34 − 1,14 × 326,48 = 1.992,15
    expect(reduccionRendimientosTrabajoCents(1_800_000)).toBe(199_215)
  })

  it('rechaza decimales y negativos', () => {
    expect(() => reduccionRendimientosTrabajoCents(1000.5)).toThrow('entero')
    expect(() => reduccionRendimientosTrabajoCents(-1)).toThrow('negativo')
  })
})
