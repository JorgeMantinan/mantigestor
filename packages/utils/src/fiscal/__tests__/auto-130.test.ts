import { describe, it, expect } from 'vitest'
import { calcularModelo130, pagosFraccionados130, calcularMinimoMultiannual, calcularReduccionIrregular } from '../modelo-130'

describe('calcularModelo130 — datos válidos', () => {
  it('calcula rendimiento neto y cuota al 20%', () => {
    const r = calcularModelo130(100_000, 30_000, 0)
    expect(r.rendimientoNeto).toBe(70_000)
    expect(r.cuotaIntegra).toBe(Math.round(70_000 * 0.20))
    expect(r.porcentajeRetencion).toBe(20)
  })

  it('resta pagos anteriores y retenciones de nómina', () => {
    const r = calcularModelo130(100_000, 0, 10_000, 5_000)
    expect(r.cuotaIntegra).toBe(Math.round(100_000 * 0.20))
    expect(r.resultadoFinal).toBe(r.cuotaIntegra - 10_000 - 5_000)
    expect(r.aIngresar).toBe(Math.max(0, r.resultadoFinal))
  })

  it('con 5 años de actividad aplica reducción multi-annual del 8%', () => {
    const r = calcularModelo130(100_000, 0, 0, 0, 5)
    expect(r.reduccionMultiannual).toBe(Math.round(100_000 * 0.08))
    const esperado = Math.round(100_000 * 0.92 * 0.20)
    expect(r.cuotaIntegra).toBe(esperado)
  })

  it('con reducción irregular aplica 30% adicional', () => {
    const r = calcularModelo130(100_000, 0, 0, 0, 1, true)
    expect(r.reduccionIrregular).toBeGreaterThan(0)
    expect(r.rendimientoNetoTrasReducciones).toBeLessThan(r.rendimientoNeto)
  })
})

describe('calcularModelo130 — datos vacíos', () => {
  it('ingresos 0 genera rendimiento neto 0 y sin actividad', () => {
    const r = calcularModelo130(0, 0, 0)
    expect(r.rendimientoNeto).toBe(0)
    expect(r.sinActividad).toBe(true)
    expect(r.cuotaIntegra).toBe(0)
  })

  it('gastos superiores a ingresos genera rendimiento neto 0', () => {
    const r = calcularModelo130(10_000, 50_000, 0)
    expect(r.rendimientoNeto).toBe(0)
    expect(r.aIngresar).toBe(0)
  })
})

describe('calcularModelo130 — casos extremos', () => {
  it('valores negativos en ingresos se tratan como 0', () => {
    const r = calcularModelo130(-10_000, 0, 0)
    expect(r.rendimientoNeto).toBe(0)
  })

  it('valores muy grandes no producen NaN', () => {
    const r = calcularModelo130(1_000_000_000, 0, 0)
    expect(Number.isFinite(r.cuotaIntegra)).toBe(true)
  })

  it('aIngresar nunca es negativo', () => {
    const r = calcularModelo130(10_000, 0, 100_000)
    expect(r.aIngresar).toBeGreaterThanOrEqual(0)
  })
})

describe('pagosFraccionados130', () => {
  it('acumula beneficios y resta pagos anteriores', () => {
    const res = pagosFraccionados130([50_000, 30_000, 20_000, 10_000])
    expect(res).toHaveLength(4)
    expect(res[0].beneficioAcumulado).toBe(50_000)
    expect(res[1].beneficioAcumulado).toBe(80_000)
    expect(res[2].beneficioAcumulado).toBe(100_000)
    expect(res[3].beneficioAcumulado).toBe(110_000)
  })

  it('cuota acumulada no puede ser negativa', () => {
    const res = pagosFraccionados130([-50_000, -30_000, 0, 0])
    for (const fila of res) {
      expect(fila.cuotaAcumulada).toBeGreaterThanOrEqual(0)
    }
  })
})

describe('calcularMinimoMultiannual', () => {
  it('1 año de actividad = 0% reducción', () => {
    expect(calcularMinimoMultiannual(1)).toBe(0)
  })

  it('5 años = 8% reducción', () => {
    expect(calcularMinimoMultiannual(5)).toBe(8)
  })

  it('máximo 15%', () => {
    expect(calcularMinimoMultiannual(20)).toBe(15)
  })
})

describe('calcularReduccionIrregular', () => {
  it('no aplica si esIrregular es false', () => {
    expect(calcularReduccionIrregular(100_000, false)).toBe(0)
  })

  it('no aplica si rendimiento neto es 0', () => {
    expect(calcularReduccionIrregular(0, true)).toBe(0)
  })

  it('aplica 30% sobre rendimiento neto', () => {
    expect(calcularReduccionIrregular(100_000, true)).toBe(30_000)
  })
})
