import { describe, it, expect } from 'vitest'
import { calcularIva, extraerBaseDeTotal } from '../iva'

describe('calcularIva', () => {
  it('calcula IVA al 21% correctamente', () => {
    const r = calcularIva(10000, 21)
    expect(r.importeIva).toBe(2100)
    expect(r.importeTotal).toBe(12100)
    expect(r.base).toBe(10000)
  })

  it('calcula IVA al 10% correctamente', () => {
    const r = calcularIva(5000, 10)
    expect(r.importeIva).toBe(500)
    expect(r.importeTotal).toBe(5500)
  })

  it('calcula IVA al 4% superreducido', () => {
    const r = calcularIva(2000, 4)
    expect(r.importeIva).toBe(80)
    expect(r.importeTotal).toBe(2080)
  })

  it('IVA al 0% devuelve importeIva cero', () => {
    const r = calcularIva(8000, 0)
    expect(r.importeIva).toBe(0)
    expect(r.importeTotal).toBe(8000)
  })

  it('redondea correctamente importes con decimales', () => {
    const r = calcularIva(333, 21)
    expect(r.importeIva).toBe(70)
    expect(r.importeTotal).toBe(403)
  })

  it('lanza error con importe negativo', () => {
    expect(() => calcularIva(-100, 21)).toThrow('no puede ser negativo')
  })

  it('lanza error con importe decimal', () => {
    expect(() => calcularIva(10.5, 21)).toThrow('entero')
  })
})

describe('extraerBaseDeTotal', () => {
  it('extrae la base correctamente con IVA incluido', () => {
    const r = extraerBaseDeTotal(12100, 21)
    expect(r.base).toBe(10000)
    expect(r.importeIva).toBe(2100)
    expect(r.importeTotal).toBe(12100)
  })
})
