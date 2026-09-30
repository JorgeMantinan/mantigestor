import { describe, it, expect } from 'vitest'
import { calcularModelo233, incrementoDeduccionGuarderia, DEDUCCION_MAXIMA_GUARDERIA_CENTS, type Menor233 } from '../modelo-233'

function menor(overrides: Partial<Menor233>): Menor233 {
  return { nif: '12345678A', nombre: 'Menor Demo', meses: 9, gastosPagadosCents: 480_000, subvencionCents: 0, ...overrides }
}

describe('calcularModelo233 — gastos en guarderías (lo presenta el centro)', () => {
  it('suma gastos, subvenciones y gastos netos por menor', () => {
    const res = calcularModelo233({
      menores: [menor({}), menor({ nif: '87654321B', gastosPagadosCents: 300_000, subvencionCents: 60_000 })],
    })
    expect(res.numMenores).toBe(2)
    expect(res.gastosTotalesCents).toBe(780_000)
    expect(res.subvencionesTotalesCents).toBe(60_000)
    expect(res.gastosNetosCents).toBe(720_000)
    expect(res.incrementoMaximoDeduccionCents).toBe(DEDUCCION_MAXIMA_GUARDERIA_CENTS)
    expect(res.avisos.length).toBe(0)
  })

  it('avisa si los meses están fuera de rango o la subvención supera los gastos', () => {
    const res = calcularModelo233({
      menores: [menor({ meses: 15 }), menor({ nif: 'X', gastosPagadosCents: 10_000, subvencionCents: 20_000 })],
    })
    expect(res.avisos.length).toBe(2)
  })
})

describe('incrementoDeduccionGuarderia (art. 81.2 LIRPF)', () => {
  it('el 25% de hasta 4.000 €, con tope de 1.000 €', () => {
    expect(incrementoDeduccionGuarderia(0)).toBe(0)
    expect(incrementoDeduccionGuarderia(200_000)).toBe(50_000) // 25% de 2.000 €
    expect(incrementoDeduccionGuarderia(400_000)).toBe(100_000) // tope 1.000 €
    expect(incrementoDeduccionGuarderia(900_000)).toBe(100_000)
  })
})
