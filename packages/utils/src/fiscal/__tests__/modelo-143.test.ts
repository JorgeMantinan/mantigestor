import { describe, it, expect } from 'vitest'
import { calcularModelo143, CUANTIAS_143 } from '../modelo-143'

describe('calcularModelo143 — abono anticipado (familia numerosa / discapacidad)', () => {
  it('familia numerosa general: 100 €/mes y 1.200 €/año', () => {
    const res = calcularModelo143({ concepto: 'familiaNumerosaGeneral', modo: 'individual' })
    expect(res.mensualCents).toBe(10_000)
    expect(res.anualCents).toBe(120_000)
    expect(res.abonoEstimadoCents).toBe(120_000)
    expect(res.meses).toBe(12)
  })

  it('familia numerosa especial: 200 €/mes y 2.400 €/año', () => {
    const res = calcularModelo143({ concepto: 'familiaNumerosaEspecial', modo: 'colectiva' })
    expect(res.mensualCents).toBe(20_000)
    expect(res.anualCents).toBe(240_000)
    expect(res.modo).toBe('colectiva')
  })

  it('discapacidad y ascendiente con dos hijos: 1.200 €/año', () => {
    expect(CUANTIAS_143.discapacidad.anualCents).toBe(120_000)
    expect(CUANTIAS_143.ascendienteDosHijos.anualCents).toBe(120_000)
  })

  it('prorratea por los meses de abono indicados', () => {
    const res = calcularModelo143({ concepto: 'familiaNumerosaGeneral', modo: 'individual', meses: 6 })
    expect(res.meses).toBe(6)
    expect(res.abonoEstimadoCents).toBe(60_000)
  })
})
