import { describe, it, expect } from 'vitest'
import { calcularModelo179 } from '../modelo-179'

describe('calcularModelo179 — viviendas turísticas', () => {
  it('calcula días totales y promedio para varias viviendas', () => {
    const r = calcularModelo179({ diasAlquiler: 120, rendimiento: 12_000, viviendas: 2 })
    expect(r.diasTotales).toBe(240)
    expect(r.promedioDias).toBe(120)
    expect(r.rendimientoTotal).toBe(12_000)
  })

  it('funciona con una única vivienda', () => {
    const r = calcularModelo179({ diasAlquiler: 30, rendimiento: 1_500, viviendas: 1 })
    expect(r.diasTotales).toBe(30)
    expect(r.promedioDias).toBe(30)
  })

  it('devuelve ceros sin viviendas', () => {
    const r = calcularModelo179({ diasAlquiler: 90, rendimiento: 0, viviendas: 0 })
    expect(r.diasTotales).toBe(0)
    expect(r.promedioDias).toBe(0)
  })

  it('trata las viviendas negativas como cero', () => {
    const r = calcularModelo179({ diasAlquiler: 60, rendimiento: 900, viviendas: -1 })
    expect(r.viviendas).toBe(0)
    expect(r.diasTotales).toBe(0)
    expect(r.promedioDias).toBe(0)
  })

  it('acumula el rendimiento total sin modificarlo', () => {
    const r = calcularModelo179({ diasAlquiler: 365, rendimiento: 30_500, viviendas: 3 })
    expect(r.rendimientoTotal).toBe(30_500)
    expect(r.diasTotales).toBe(1_095)
  })
})