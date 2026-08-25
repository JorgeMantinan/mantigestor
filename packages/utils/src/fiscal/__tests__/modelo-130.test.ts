import { describe, it, expect } from 'vitest'
import { pagosFraccionados130 } from '../modelo-130'

describe('pagosFraccionados130', () => {
  it('calcula pagos crecientes sobre beneficio acumulado positivo', () => {
    const filas = pagosFraccionados130([10000, 20000, 0, 0])
    expect(filas[0]).toMatchObject({ cuotaAcumulada: 2000, aIngresar: 2000 })
    // acumulado 30.000 → cuota 6.000 − 2.000 ya pagado = 4.000
    expect(filas[1]).toMatchObject({ cuotaAcumulada: 6000, pagosAnteriores: 2000, aIngresar: 4000 })
    expect(filas[2]?.aIngresar).toBe(0)
    expect(filas[3]?.aIngresar).toBe(0)
  })

  it('un beneficio negativo posterior reduce los pagos siguientes (no devuelve)', () => {
    // Q1 +20.000 (pago 4.000), Q2 −25.000 → acumulado −5.000 → cuota 0, pago 0
    const filas = pagosFraccionados130([20000, -25000])
    expect(filas[0]?.aIngresar).toBe(4000)
    expect(filas[1]?.cuotaAcumulada).toBe(0)
    expect(filas[1]?.aIngresar).toBe(0)
  })

  it('recupera el pago cuando el acumulado vuelve a subir por encima de lo ya pagado', () => {
    // Q1 +20.000 → 4.000; Q2 −18.000 → acumulado 2.000 → cuota 400 < 4.000 → 0; Q3 +40.000 → acumulado 42.000 → cuota 8.400 − 4.000 = 4.400
    const filas = pagosFraccionados130([20000, -18000, 40000])
    expect(filas[1]?.aIngresar).toBe(0)
    expect(filas[2]).toMatchObject({ cuotaAcumulada: 8400, pagosAnteriores: 4000, aIngresar: 4400 })
  })

  it('redondea al céntimo/entero más próximo', () => {
    const filas = pagosFraccionados130([3333])
    expect(filas[0]?.cuotaAcumulada).toBe(Math.round(3333 * 0.2))
  })

  it('tolera arrays vacíos devolviendo ceros', () => {
    const filas = pagosFraccionados130([])
    expect(filas).toHaveLength(4)
    expect(filas.every(f => f.aIngresar === 0)).toBe(true)
  })
})
