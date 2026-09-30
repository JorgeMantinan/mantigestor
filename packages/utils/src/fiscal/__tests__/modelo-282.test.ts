import { describe, it, expect } from 'vitest'
import { calcularModelo282, type Ayuda282 } from '../modelo-282'

function ayuda(overrides: Partial<Ayuda282>): Ayuda282 {
  return {
    organismo: 'Gobierno de Canarias',
    concepto: 'Ayuda REF — inversión',
    ejercicio: 2026,
    importeCents: 500_000,
    ...overrides,
  }
}

describe('calcularModelo282 — ayudas REF Canarias y ayudas de Estado', () => {
  it('suma las ayudas y las agrupa por ejercicio', () => {
    const res = calcularModelo282({
      ayudas: [ayuda({}), ayuda({ ejercicio: 2026, importeCents: 250_000 }), ayuda({ ejercicio: 2025, concepto: 'Ayuda Estado' })],
    })
    expect(res.numAyudas).toBe(3)
    expect(res.totalCents).toBe(1_250_000)
    expect(res.porEjercicio).toEqual([
      { ejercicio: 2025, totalCents: 500_000 },
      { ejercicio: 2026, totalCents: 750_000 },
    ])
    expect(res.avisos.length).toBe(0)
  })

  it('avisa si falta el organismo concedente', () => {
    const res = calcularModelo282({ ayudas: [ayuda({ organismo: '' })] })
    expect(res.avisos.length).toBe(1)
  })

  it('sin ayudas devuelve totales a cero', () => {
    const res = calcularModelo282({ ayudas: [] })
    expect(res.totalCents).toBe(0)
    expect(res.porEjercicio).toEqual([])
  })
})
