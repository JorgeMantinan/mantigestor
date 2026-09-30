import { describe, it, expect } from 'vitest'
import { calcularPlusvaliaMunicipal } from '../plusvalia-municipal'

describe('calcularPlusvaliaMunicipal — IIVTNU', () => {
  it('calcula la base objetiva sobre el valor catastral y el coeficiente por años', () => {
    // valor catastral 100.000, 5 años → coef 0.18 (tabla 2026) → base 18.000
    const r = calcularPlusvaliaMunicipal({
      valorCatastralTerreno: 100_000,
      anyosTenencia: 5,
      tipoMunicipal: 30,
      metodo: 'objetivo',
    })
    expect(r.baseImponible).toBe(18_000)
  })

  it('aplica el tipo municipal sobre la base objetiva', () => {
    const r = calcularPlusvaliaMunicipal({
      valorCatastralTerreno: 100_000,
      anyosTenencia: 10,
      tipoMunicipal: 30,
      metodo: 'objetivo',
    })
    // coef 10 años = 0.16 (tabla 2026) → base 16.000 × 30% = 4.800
    expect(r.cuota).toBeCloseTo(4_800, 1)
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
    // 8 años → coef 0.23 (tabla 2026) → base objetiva 23.000; plusvalía real 60.000 → favorable = objetivo
    const r = calcularPlusvaliaMunicipal({
      valorCatastralTerreno: 100_000,
      anyosTenencia: 8,
      tipoMunicipal: 30,
      metodo: 'real',
      valorAdquisicion: 120_000,
      valorTransmision: 180_000,
    })
    expect(r.baseObjetiva).toBeCloseTo(23_000, 1)
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
    // min(23.000, 60.000) = 23.000 × 30% = 6.900
    expect(r.cuotaMinima).toBeCloseTo(6_900, 1)
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
