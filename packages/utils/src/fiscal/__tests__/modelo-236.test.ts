import { describe, it, expect } from 'vitest'
import { calcularModelo236, type Mecanismo236 } from '../modelo-236'

function mecanismo(overrides: Partial<Mecanismo236>): Mecanismo236 {
  return {
    descripcion: 'Acuerdo de refinanciación transfronterizo',
    fechaUtilizacion: '2026-05-10',
    estadosAfectados: 'España; Alemania',
    primeraDeclaracion: true,
    comercializable: false,
    ...overrides,
  }
}

describe('calcularModelo236 — utilización de mecanismos transfronterizos (DAC6)', () => {
  it('cuenta mecanismos y fija el plazo en el último trimestre del año siguiente', () => {
    const res = calcularModelo236({
      anyoUtilizacion: 2026,
      mecanismos: [mecanismo({}), mecanismo({ primeraDeclaracion: false, comercializable: true })],
    })
    expect(res.numMecanismos).toBe(2)
    expect(res.anyoPresentacion).toBe(2027)
    expect(res.plazo).toContain('2027')
    expect(res.numPrimeraDeclaracion).toBe(1)
    expect(res.numComercializables).toBe(1)
    expect(res.avisos.length).toBe(0)
  })

  it('avisa con fechas fuera del ejercicio o estados sin indicar', () => {
    const res = calcularModelo236({
      anyoUtilizacion: 2026,
      mecanismos: [
        mecanismo({ fechaUtilizacion: '2025-11-01' }),
        mecanismo({ estadosAfectados: '  ' }),
        mecanismo({ fechaUtilizacion: 'no-fecha' }),
      ],
    })
    expect(res.numMecanismos).toBe(3)
    expect(res.avisos.length).toBe(3)
  })

  it('sin mecanismos devuelve cero sin avisos', () => {
    const res = calcularModelo236({ anyoUtilizacion: 2026, mecanismos: [] })
    expect(res.numMecanismos).toBe(0)
    expect(res.avisos.length).toBe(0)
  })
})
