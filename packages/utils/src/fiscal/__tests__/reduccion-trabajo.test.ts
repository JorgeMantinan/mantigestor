import { describe, it, expect } from 'vitest'
import {
  reduccionRendimientosTrabajoCents,
  deduccionTrabajoCents,
  DEDUCCION_TRABAJO_2025,
  DEDUCCION_TRABAJO_2026,
} from '../reduccion-trabajo'

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
    expect(reduccionRendimientosTrabajoCents(2_000_000)).toBe(0)
    expect(reduccionRendimientosTrabajoCents(1_800_000)).toBe(199_215)
  })

  it('rechaza decimales y negativos', () => {
    expect(() => reduccionRendimientosTrabajoCents(1000.5)).toThrow('entero')
    expect(() => reduccionRendimientosTrabajoCents(-1)).toThrow('negativo')
  })
})

describe('deduccionTrabajoCents (DA 61ª LIRPF, Ley 5/2025)', () => {
  it('2025: aplica 340€ para rendimientos ≤ 16.576€', () => {
    expect(deduccionTrabajoCents(0, DEDUCCION_TRABAJO_2025)).toBe(34_000)
    expect(deduccionTrabajoCents(1_657_600, DEDUCCION_TRABAJO_2025)).toBe(34_000)
  })

  it('2025: reduce progresivamente entre 16.576€ y 18.276€', () => {
    // 17.438€ → 340 - 0,2 × (17.438 - 16.576) = 340 - 172,40 = 167,60
    expect(deduccionTrabajoCents(1_743_800, DEDUCCION_TRABAJO_2025)).toBe(16_760)
  })

  it('2025: devuelve 0 para rendimientos > 18.276€', () => {
    expect(deduccionTrabajoCents(1_827_601, DEDUCCION_TRABAJO_2025)).toBe(0)
  })

  it('2026: aplica 590,89€ para rendimientos ≤ 17.094€', () => {
    expect(deduccionTrabajoCents(0, DEDUCCION_TRABAJO_2026)).toBe(59_089)
    expect(deduccionTrabajoCents(1_709_400, DEDUCCION_TRABAJO_2026)).toBe(59_089)
  })

  it('2026: reduce progresivamente entre 17.094€ y 20.048,45€', () => {
    // 18.571€ → 590,89 - 0,2 × (18.571 - 17.094) = 590,89 - 295,40 = 295,49
    expect(deduccionTrabajoCents(1_857_100, DEDUCCION_TRABAJO_2026)).toBe(29_549)
  })

  it('2026: devuelve 0 para rendimientos > 20.048,45€', () => {
    expect(deduccionTrabajoCents(2_004_846, DEDUCCION_TRABAJO_2026)).toBe(0)
  })

  it('respeta el límite de cuota atribuible a trabajo', () => {
    // Si la cuota atribuible es solo 200€, la deducción se limita a 200€
    expect(deduccionTrabajoCents(500_000, DEDUCCION_TRABAJO_2026, 20_000)).toBe(20_000)
  })
})
