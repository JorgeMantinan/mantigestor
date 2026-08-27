import { describe, it, expect } from 'vitest'
import { calcularPlusvaliaMunicipal } from '../plusvalia-municipal'

describe('calcularPlusvaliaMunicipal — IIVTNU', () => {
  it('calcula la base objetiva sobre el valor catastral y el coeficiente por años', () => {
    // valor catastral 100.000, 5 años → coef 0.52 → base 52.000
    const r = calcularPlusvaliaMunicipal({
      valorCatastralTerreno: 100_000,
      anyosTenencia: 5,
      tipoMunicipal: 30,
      metodo: 'objetivo',
    })
    expect(r.baseImponible).toBe(52_000)
  })

  it('aplica el tipo municipal sobre la base objetiva', () => {
    const r = calcularPlusvaliaMunicipal({
      valorCatastralTerreno: 100_000,
      anyosTenencia: 10,
      tipoMunicipal: 30,
      metodo: 'objetivo',
    })
    // coef 10 años = 0.42 → base 42.000 × 30% = 12.600
    expect(r.cuota).toBeCloseTo(12_600, 1)
  })

  it('baja el coeficiente cuanto más años de tenencia', () => {
    const joven = calcularPlusvaliaMunicipal({ valorCatastralTerreno: 100_000, anyosTenencia: 2, tipoMunicipal: 30, metodo: 'objetivo' })
    const mayor = calcularPlusvaliaMunicipal({ valorCatastralTerreno: 100_000, anyosTenencia: 15, tipoMunicipal: 30, metodo: 'objetivo' })
    expect(joven.baseImponible).toBeGreaterThan(mayor.baseImponible)
  })

  it('con el método real usa el incremento de valor', () => {
    const r = calcularPlusvaliaMunicipal({
      valorCatastralTerreno: 100_000,
      anyosTenencia: 8,
      tipoMunicipal: 30,
      metodo: 'real',
      valorAdquisicion: 120_000,
      valorTransmision: 180_000,
    })
    expect(r.baseImponible).toBe(60_000)
    expect(r.cuota).toBeCloseTo(18_000, 1)
  })

  it('detecta el método más favorable por menor base', () => {
    // 8 años → coef 0.46 → base objetiva 46.000; plusvalía real 60.000 → favorable = objetivo
    const r = calcularPlusvaliaMunicipal({
      valorCatastralTerreno: 100_000,
      anyosTenencia: 8,
      tipoMunicipal: 30,
      metodo: 'real',
      valorAdquisicion: 120_000,
      valorTransmision: 180_000,
    })
    expect(r.baseObjetiva).toBeCloseTo(46_000, 1)
    expect(r.metodoFavorable).toBe('objetivo')
    expect(r.baseReal).toBe(60_000)
  })

  it('calcula la cuota mínima como la del método más favorable', () => {
    const r = calcularPlusvaliaMunicipal({
      valorCatastralTerreno: 100_000,
      anyosTenencia: 8,
      tipoMunicipal: 30,
      metodo: 'objetivo',
      valorAdquisicion: 120_000,
      valorTransmision: 180_000,
    })
    // min(46.000, 60.000) = 46.000 × 30% = 13.800
    expect(r.cuotaMinima).toBeCloseTo(13_800, 1)
  })

  it('advierte si en el método real no hay incremento', () => {
    const r = calcularPlusvaliaMunicipal({
      valorCatastralTerreno: 100_000,
      anyosTenencia: 8,
      tipoMunicipal: 30,
      metodo: 'real',
      valorAdquisicion: 180_000,
      valorTransmision: 170_000,
    })
    expect(r.cuota).toBe(0)
    expect(r.avisos.some(a => a.includes('No hay incremento'))).toBe(true)
  })
})
