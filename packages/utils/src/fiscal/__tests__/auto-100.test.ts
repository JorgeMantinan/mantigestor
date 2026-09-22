import { describe, it, expect } from 'vitest'
import { calcularModelo100, type DatosModelo100 } from '../modelo-100'

function datos(overrides: Partial<DatosModelo100>): DatosModelo100 {
  return {
    baseImponibleGeneral: 0,
    baseImponibleAhorro: 0,
    reduccionTrabajo: 0,
    reduccionAhorro: 0,
    minimoPersonalFamiliar: 0,
    deduccionesAutonomicas: 0,
    pagosFraccionados: 0,
    retenciones: 0,
    dividendosIRPF: 0,
    ...overrides,
  }
}

describe('calcularModelo100 — datos válidos', () => {
  it('calcula cuota integra con base general de 20.000 €', () => {
    const r = calcularModelo100(datos({ baseImponibleGeneral: 2_000_000 }))
    expect(r.cuotaIntegra).toBeGreaterThan(0)
    expect(r.baseImponibleGeneral).toBe(2_000_000)
  })

  it('suma cuota general + ahorro en totalCuota', () => {
    const r = calcularModelo100(
      datos({ baseImponibleGeneral: 1_000_000, baseImponibleAhorro: 500_000 })
    )
    expect(r.totalCuota).toBe(r.cuotaIntegra + r.cuotaAhorro)
  })

  it('calcula aPagar cuando cuota supera retenciones', () => {
    const r = calcularModelo100(
      datos({ baseImponibleGeneral: 3_000_000, retenciones: 100_000 })
    )
    expect(r.aPagar).toBeGreaterThan(0)
    expect(r.aDevolver).toBe(0)
  })

  it('calcula aDevolver cuando retenciones superan cuota', () => {
    const r = calcularModelo100(
      datos({ baseImponibleGeneral: 1_000_000, retenciones: 500_000 })
    )
    expect(r.aDevolver).toBeGreaterThan(0)
    expect(r.aPagar).toBe(0)
  })
})

describe('calcularModelo100 — datos vacíos', () => {
  it('base imponible 0 genera cuota 0', () => {
    const r = calcularModelo100(datos({}))
    expect(r.cuotaIntegra).toBe(0)
    expect(r.cuotaAhorro).toBe(0)
    expect(r.totalCuota).toBe(0)
  })

  it('sin retenciones ni pagos, aPagar = cuota líquida', () => {
    const r = calcularModelo100(datos({ baseImponibleGeneral: 2_000_000 }))
    expect(r.aPagar).toBe(r.cuotaLiquida)
  })
})

describe('calcularModelo100 — casos extremos', () => {
  it('valores negativos se tratan como 0', () => {
    const r = calcularModelo100(datos({ baseImponibleGeneral: -100_000 }))
    expect(r.cuotaIntegra).toBe(0)
  })

  it('base muy grande no produce NaN', () => {
    const r = calcularModelo100(datos({ baseImponibleGeneral: 100_000_000 }))
    expect(Number.isFinite(r.cuotaIntegra)).toBe(true)
    expect(r.cuotaIntegra).toBeGreaterThan(0)
  })

  it('reducción del trabajo no puede hacer base negativa', () => {
    const r = calcularModelo100(
      datos({ baseImponibleGeneral: 100_000, reduccionTrabajo: 200_000 })
    )
    expect(r.baseImponibleGeneral).toBeGreaterThanOrEqual(0)
  })
})
