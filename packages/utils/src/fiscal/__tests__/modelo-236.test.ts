import { describe, it, expect } from 'vitest'
import { calcularModelo236 } from '../modelo-236'

describe('calcularModelo236 — bienes y derechos en el extranjero', () => {
  it('devuelve ceros con datos vacíos', () => {
    const r = calcularModelo236({
      cuentasBancarias: [],
      inmuebles: [],
      valores: [],
      seguros: [],
    })
    expect(r.totalCuentas).toBe(0)
    expect(r.totalInmuebles).toBe(0)
    expect(r.totalValores).toBe(0)
    expect(r.totalSeguros).toBe(0)
    expect(r.totalGlobal).toBe(0)
    expect(r.numEntidades).toBe(0)
  })

  it('suma una sola cuenta bancaria correctamente', () => {
    const r = calcularModelo236({
      cuentasBancarias: [
        { entidad: 'HSBC', pais: 'GB', iban: 'GB29NWBK60161331926819', saldoFinalCents: 150_000, saldoMaximoCents: 200_000 },
      ],
      inmuebles: [],
      valores: [],
      seguros: [],
    })
    expect(r.totalCuentas).toBe(150_000)
    expect(r.totalGlobal).toBe(150_000)
    expect(r.numEntidades).toBe(1)
  })

  it('agrega múltiples tipos de activos y calcula totales por tipo', () => {
    const r = calcularModelo236({
      cuentasBancarias: [
        { entidad: 'HSBC', pais: 'GB', iban: 'GB01', saldoFinalCents: 100_000, saldoMaximoCents: 120_000 },
        { entidad: 'BNP', pais: 'FR', iban: 'FR01', saldoFinalCents: 200_000, saldoMaximoCents: 200_000 },
      ],
      inmuebles: [
        { direccion: '123 Main St', pais: 'US', valorCents: 500_000 },
      ],
      valores: [
        { entidad: 'Interactive Brokers', pais: 'US', valorFinalCents: 300_000 },
        { entidad: 'Saxo Bank', pais: 'DK', valorFinalCents: 150_000 },
      ],
      seguros: [
        { entidad: 'Allianz', pais: 'DE', capitalCents: 80_000 },
      ],
    })
    expect(r.totalCuentas).toBe(300_000)
    expect(r.totalInmuebles).toBe(500_000)
    expect(r.totalValores).toBe(450_000)
    expect(r.totalSeguros).toBe(80_000)
    expect(r.totalGlobal).toBe(1_330_000)
  })

  it('cuenta entidades únicas por combinación entidad|país', () => {
    const r = calcularModelo236({
      cuentasBancarias: [
        { entidad: 'HSBC', pais: 'GB', iban: 'GB01', saldoFinalCents: 100_000, saldoMaximoCents: 100_000 },
        { entidad: 'HSBC', pais: 'GB', iban: 'GB02', saldoFinalCents: 50_000, saldoMaximoCents: 50_000 },
      ],
      inmuebles: [
        { direccion: 'Calle A', pais: 'ES', valorCents: 200_000 },
      ],
      valores: [],
      seguros: [],
    })
    expect(r.numEntidades).toBe(2)
    expect(r.totalGlobal).toBe(350_000)
  })

  it('maneja valores negativos en saldos', () => {
    const r = calcularModelo236({
      cuentasBancarias: [
        { entidad: 'Deutsche Bank', pais: 'DE', iban: 'DE01', saldoFinalCents: -10_000, saldoMaximoCents: 0 },
      ],
      inmuebles: [],
      valores: [],
      seguros: [],
    })
    expect(r.totalCuentas).toBe(-10_000)
    expect(r.totalGlobal).toBe(-10_000)
  })
})
