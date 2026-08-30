import { describe, it, expect } from 'vitest'
import { calcularModelo715 } from '../modelo-715'

describe('calcularModelo715 — inversiones en el extranjero', () => {
  it('devuelve ceros con array vacío', () => {
    const r = calcularModelo715([])
    expect(r.totalValores).toBe(0)
    expect(r.totalParticipaciones).toBe(0)
    expect(r.totalMuebles).toBe(0)
    expect(r.totalGlobal).toBe(0)
    expect(r.numInversiones).toBe(0)
    expect(r.inversionesPorPais).toEqual({})
  })

  it('procesa una sola inversión', () => {
    const r = calcularModelo715([
      {
        tipo: 'valores',
        entidad: 'Goldman Sachs',
        pais: 'US',
        fechaAdquisicion: '2020-01-15',
        valorAdquisicionCents: 200_000,
        valorActualCents: 350_000,
      },
    ])
    expect(r.totalValores).toBe(350_000)
    expect(r.totalGlobal).toBe(350_000)
    expect(r.numInversiones).toBe(1)
    expect(r.inversionesPorPais).toEqual({ US: 350_000 })
  })

  it('agrega múltiples tipos de inversión', () => {
    const r = calcularModelo715([
      {
        tipo: 'valores',
        entidad: 'Saxo Bank',
        pais: 'DK',
        fechaAdquisicion: '2019-06-01',
        valorAdquisicionCents: 100_000,
        valorActualCents: 180_000,
      },
      {
        tipo: 'participaciones',
        entidad: 'BNP Paribas',
        pais: 'FR',
        fechaAdquisicion: '2021-03-10',
        valorAdquisicionCents: 250_000,
        valorActualCents: 300_000,
      },
      {
        tipo: 'muebles',
        entidad: 'Deutsche Bank',
        pais: 'DE',
        fechaAdquisicion: '2018-09-20',
        valorAdquisicionCents: 400_000,
        valorActualCents: 500_000,
      },
    ])
    expect(r.totalValores).toBe(180_000)
    expect(r.totalParticipaciones).toBe(300_000)
    expect(r.totalMuebles).toBe(500_000)
    expect(r.totalGlobal).toBe(980_000)
    expect(r.numInversiones).toBe(3)
  })

  it('agrupa por país correctamente', () => {
    const r = calcularModelo715([
      {
        tipo: 'valores',
        entidad: 'HSBC',
        pais: 'GB',
        fechaAdquisicion: '2020-01-01',
        valorAdquisicionCents: 100_000,
        valorActualCents: 150_000,
      },
      {
        tipo: 'valores',
        entidad: 'Barclays',
        pais: 'GB',
        fechaAdquisicion: '2021-06-01',
        valorAdquisicionCents: 80_000,
        valorActualCents: 120_000,
      },
      {
        tipo: 'participaciones',
        entidad: 'ING',
        pais: 'NL',
        fechaAdquisicion: '2022-01-01',
        valorAdquisicionCents: 200_000,
        valorActualCents: 200_000,
      },
    ])
    expect(r.inversionesPorPais).toEqual({ GB: 270_000, NL: 200_000 })
    expect(r.totalGlobal).toBe(470_000)
  })

  it('usa valorActualCents (no adquisición) para los totales', () => {
    const r = calcularModelo715([
      {
        tipo: 'valores',
        entidad: 'UBS',
        pais: 'CH',
        fechaAdquisicion: '2015-01-01',
        valorAdquisicionCents: 50_000,
        valorActualCents: 500_000,
      },
    ])
    expect(r.totalValores).toBe(500_000)
    expect(r.totalGlobal).toBe(500_000)
  })
})
