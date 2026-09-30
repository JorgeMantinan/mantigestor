import { describe, it, expect } from 'vitest'
import {
  calcularModelo130,
  pagosFraccionados130,
  minoracionPagosFraccionados,
  DEDUCCION_VIVIENDA_MAX_TRIMESTRE,
} from '../modelo-130'

describe('calcularModelo130 — estimación directa (20 %)', () => {
  it('calcula rendimiento neto y cuota al 20%', () => {
    const r = calcularModelo130(100_000, 30_000, 0)
    expect(r.rendimientoNeto).toBe(70_000)
    expect(r.cuotaIntegra).toBe(14_000)
    expect(r.porcentajeRetencion).toBe(20)
  })

  it('resta pagos anteriores y retenciones de nómina', () => {
    const r = calcularModelo130(100_000, 0, 10_000, 5_000)
    expect(r.cuotaIntegra).toBe(20_000)
    expect(r.resultadoFinal).toBe(20_000 - 10_000 - 5_000)
    expect(r.aIngresar).toBe(5_000)
  })

  it('sin rendimientos negativos el rendimiento neto queda en cero', () => {
    const r = calcularModelo130(10_000, 50_000, 0)
    expect(r.rendimientoNeto).toBe(0)
    expect(r.cuotaIntegra).toBe(0)
    expect(r.sinActividad).toBe(true)
  })
})

describe('minoracionPagosFraccionados (rendimientos del ejercicio anterior)', () => {
  it('aplica la escala oficial 25/50/75/100 €', () => {
    expect(minoracionPagosFraccionados(undefined)).toBe(0)
    expect(minoracionPagosFraccionados(12_001)).toBe(0)
    expect(minoracionPagosFraccionados(12_000)).toBe(25)
    expect(minoracionPagosFraccionados(11_500)).toBe(25)
    expect(minoracionPagosFraccionados(11_000)).toBe(50)
    expect(minoracionPagosFraccionados(10_000)).toBe(75)
    expect(minoracionPagosFraccionados(9_000)).toBe(100)
    expect(minoracionPagosFraccionados(1)).toBe(100)
  })

  it('se descuenta de la cuota en calcularModelo130', () => {
    const sin = calcularModelo130(100_000, 0, 0, 0, { rendimientosPreviosAnuales: 50_000 })
    const con = calcularModelo130(100_000, 0, 0, 0, { rendimientosPreviosAnuales: 9_000 })
    expect(sin.minoracionOficial).toBe(0)
    expect(con.minoracionOficial).toBe(100)
    expect(con.resultadoFinal).toBe(20_000 - 100)
  })
})

describe('deducción por vivienda (2 %, tope 660,14 €/trimestre)', () => {
  it('aplica el 2% con tope de 660,14 €', () => {
    const r = calcularModelo130(100_000, 0, 0, 0, { deduccionVivienda: true })
    expect(r.deduccionVivienda).toBe(DEDUCCION_VIVIENDA_MAX_TRIMESTRE)
    expect(r.resultadoFinal).toBe(20_000 - 660.14)
  })

  it('con rendimientos bajos aplica el 2% sin llegar al tope', () => {
    const r = calcularModelo130(10_000, 0, 0, 0, { deduccionVivienda: true })
    expect(r.deduccionVivienda).toBe(200)
  })

  it('no aplica si no se indica', () => {
    const r = calcularModelo130(100_000, 0, 0, 0)
    expect(r.deduccionVivienda).toBe(0)
  })
})

describe('calcularModelo130 — casos extremos', () => {
  it('ingresos negativos no generan cuota', () => {
    const r = calcularModelo130(-10_000, 0, 0)
    expect(r.rendimientoNeto).toBe(0)
    expect(r.cuotaIntegra).toBe(0)
  })

  it('ingresos muy altos mantienen la linealidad del 20%', () => {
    const r = calcularModelo130(1_000_000_000, 0, 0)
    expect(r.cuotaIntegra).toBe(200_000_000)
  })

  it('pagos anteriores superiores a la cuota dan 0 a ingresar', () => {
    const r = calcularModelo130(10_000, 0, 100_000)
    expect(r.resultadoFinal).toBeLessThan(0)
    expect(r.aIngresar).toBe(0)
  })
})

describe('pagosFraccionados130 — secuencia trimestral', () => {
  it('acumula beneficio y resta pagos anteriores', () => {
    const filas = pagosFraccionados130([10_000, 10_000, 10_000, 10_000])
    expect(filas[0]?.beneficioAcumulado).toBe(10_000)
    expect(filas[0]?.cuotaAcumulada).toBe(2_000)
    expect(filas[0]?.aIngresar).toBe(2_000)
    expect(filas[1]?.beneficioAcumulado).toBe(20_000)
    expect(filas[1]?.aIngresar).toBe(2_000) // 4.000 − 2.000
    expect(filas[3]?.beneficioAcumulado).toBe(40_000)
    expect(filas[3]?.aIngresar).toBe(2_000)
  })

  it('un trimestre negativo reduce el acumulado', () => {
    const filas = pagosFraccionados130([50_000, -30_000])
    expect(filas[1]?.beneficioAcumulado).toBe(20_000)
    expect(filas[1]?.cuotaAcumulada).toBe(4_000)
    expect(filas[1]?.aIngresar).toBe(0) // ya se ingresaron 10.000 > 4.000
  })

  it('sin datos devuelve ceros', () => {
    const filas = pagosFraccionados130([])
    expect(filas.every(f => f.aIngresar === 0)).toBe(true)
  })
})
