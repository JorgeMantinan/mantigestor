import { describe, it, expect } from 'vitest'
import { calcularModelo231 } from '../modelo-231'

describe('calcularModelo231 — operaciones con criptomonedas', () => {
  it('devuelve ceros con array vacío y no obligatorio', () => {
    const r = calcularModelo231({
      ejercicio: 2026,
      nif: '12345678A',
      denominacion: 'Test',
      operaciones: [],
    })
    expect(r.numOperaciones).toBe(0)
    expect(r.volumenTotalCents).toBe(0)
    expect(r.obligatorio).toBe(false)
  })

  it('calcula volumen de una operación de compra', () => {
    const r = calcularModelo231({
      ejercicio: 2026,
      nif: '12345678A',
      denominacion: 'Test',
      operaciones: [
        {
          fecha: '2026-01-15',
          tipoOperacion: 'compra',
          criptomoneda: 'BTC',
          cantidadUnidades: 0.5,
          valorEurCents: 15_000_000,
          walletOrigen: '0xABC',
          walletDestino: '0xDEF',
        },
      ],
    })
    expect(r.numOperaciones).toBe(1)
    expect(r.volumenTotalCents).toBe(15_000_000)
    expect(r.resumenPorTipo[0]?.numOperaciones).toBe(1)
  })

  it('resume compras, ventas y cambios por separado', () => {
    const r = calcularModelo231({
      ejercicio: 2026,
      nif: '12345678A',
      denominacion: 'Test',
      operaciones: [
        {
          fecha: '2026-01-10',
          tipoOperacion: 'compra',
          criptomoneda: 'BTC',
          cantidadUnidades: 1,
          valorEurCents: 30_000_000,
          walletOrigen: '0xA',
          walletDestino: '0xB',
        },
        {
          fecha: '2026-03-20',
          tipoOperacion: 'venta',
          criptomoneda: 'BTC',
          cantidadUnidades: 0.5,
          valorEurCents: 20_000_000,
          walletOrigen: '0xB',
          walletDestino: '0xC',
        },
        {
          fecha: '2026-06-05',
          tipoOperacion: 'cambio',
          criptomoneda: 'ETH',
          cantidadUnidades: 5,
          valorEurCents: 10_000_000,
          walletOrigen: '0xB',
          walletDestino: '0xD',
        },
      ],
    })
    expect(r.volumenTotalCents).toBe(60_000_000)
    expect(r.resumenPorTipo.find((t) => t.tipoOperacion === 'compra')!.numOperaciones).toBe(1)
    expect(r.resumenPorTipo.find((t) => t.tipoOperacion === 'venta')!.numOperaciones).toBe(1)
    expect(r.resumenPorTipo.find((t) => t.tipoOperacion === 'cambio')!.numOperaciones).toBe(1)
  })

  it('calcula ganancias y pérdidas por criptomoneda', () => {
    const r = calcularModelo231({
      ejercicio: 2026,
      nif: '12345678A',
      denominacion: 'Test',
      operaciones: [
        {
          fecha: '2026-01-10',
          tipoOperacion: 'venta',
          criptomoneda: 'BTC',
          cantidadUnidades: 1,
          valorEurCents: 30_000_000,
          costeAdquisicionCents: 20_000_000,
          walletOrigen: '0xA',
          walletDestino: '0xB',
        },
        {
          fecha: '2026-04-15',
          tipoOperacion: 'venta',
          criptomoneda: 'ETH',
          cantidadUnidades: 10,
          valorEurCents: 5_000_000,
          costeAdquisicionCents: 8_000_000,
          walletOrigen: '0xC',
          walletDestino: '0xD',
        },
      ],
    })
    expect(r.gananciasPerdidas).toHaveLength(2)
    expect(r.gananciasPerdidas.find((g) => g.criptomoneda === 'BTC')!.gananciaPerdidaCents).toBe(10_000_000)
    expect(r.gananciasPerdidas.find((g) => g.criptomoneda === 'ETH')!.gananciaPerdidaCents).toBe(-3_000_000)
    expect(r.totalGananciaPerdidaCents).toBe(7_000_000)
  })

  it('marca obligatorio cuando volumen supera 50.000€', () => {
    const r = calcularModelo231({
      ejercicio: 2026,
      nif: '12345678A',
      denominacion: 'Test',
      operaciones: [
        {
          fecha: '2026-02-01',
          tipoOperacion: 'compra',
          criptomoneda: 'BTC',
          cantidadUnidades: 2,
          valorEurCents: 55_000_000,
          walletOrigen: '0xA',
          walletDestino: '0xB',
        },
      ],
    })
    expect(r.obligatorio).toBe(true)
    expect(r.volumenTotalEur).toBe(550_000)
  })
})
