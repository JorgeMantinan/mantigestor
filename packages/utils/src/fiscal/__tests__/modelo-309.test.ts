import { describe, it, expect } from 'vitest'
import { calcularModelo309 } from '../modelo-309'

describe('calcularModelo309 — IVA simplificado', () => {
  it('suma las cuotas devengadas de cada tipo', () => {
    const r = calcularModelo309({
      baseImponible21: 100_000,
      baseImponible10: 50_000,
      baseImponible4: 20_000,
      cuotaDevengada21: 21_000, // 100.000 × 21%
      cuotaDevengada10: 5_000, // 50.000 × 10%
      cuotaDevengada4: 800, // 20.000 × 4%
      deducciones: 10_000,
    })
    expect(r.cuotaDevengada).toBe(26_800)
    expect(r.cuotaLiquida).toBe(16_800)
    expect(r.aIngresar).toBe(16_800)
    expect(r.aDevolver).toBe(0)
  })

  it('devuelve aDevolver cuando las deducciones superan la cuota devengada', () => {
    const r = calcularModelo309({
      baseImponible21: 100_000,
      baseImponible10: 0,
      baseImponible4: 0,
      cuotaDevengada21: 21_000,
      cuotaDevengada10: 0,
      cuotaDevengada4: 0,
      deducciones: 30_000,
    })
    expect(r.cuotaLiquida).toBe(-9_000)
    expect(r.aIngresar).toBe(0)
    expect(r.aDevolver).toBe(9_000)
  })
})
