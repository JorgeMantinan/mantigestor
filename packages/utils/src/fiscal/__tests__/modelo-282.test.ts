import { describe, it, expect } from 'vitest'
import { calcularModelo282 } from '../modelo-282'

describe('calcularModelo282 — transparencia fiscal', () => {
  it('devuelve ceros con datos vacíos', () => {
    const r = calcularModelo282({
      razonSocial: 'Vacía',
      nif: 'B00000000',
      tipoEntidad: 'fondo',
      rentasImputadas: [],
      participaciones: [],
    })
    expect(r.totalRentasImputadas).toBe(0)
    expect(r.numRentas).toBe(0)
    expect(r.numParticipaciones).toBe(0)
  })

  it('suma una sola renta imputada', () => {
    const r = calcularModelo282({
      razonSocial: 'Fondo XYZ',
      nif: 'B12345678',
      tipoEntidad: 'fondo',
      rentasImputadas: [
        { tipo: 'dividendos', importeCents: 50_000 },
      ],
      participaciones: [],
    })
    expect(r.totalRentasImputadas).toBe(50_000)
    expect(r.numRentas).toBe(1)
  })

  it('suma múltiples rentas de distintos tipos', () => {
    const r = calcularModelo282({
      razonSocial: 'SICAV ABC',
      nif: 'A98765432',
      tipoEntidad: 'SICAV',
      rentasImputadas: [
        { tipo: 'dividendos', importeCents: 120_000 },
        { tipo: 'intereses', importeCents: 30_000 },
        { tipo: 'plusvalías', importeCents: 80_000 },
      ],
      participaciones: [],
    })
    expect(r.totalRentasImputadas).toBe(230_000)
    expect(r.numRentas).toBe(3)
  })

  it('cuenta participaciones correctamente', () => {
    const r = calcularModelo282({
      razonSocial: 'Fondo Beta',
      nif: 'B11122233',
      tipoEntidad: 'fondo',
      rentasImputadas: [],
      participaciones: [
        { sociedad: 'Empresa A', nif: 'B11111111', porcentaje: 15 },
        { sociedad: 'Empresa B', nif: 'B22222222', porcentaje: 25 },
        { sociedad: 'Empresa C', nif: 'B33333333', porcentaje: 10 },
      ],
    })
    expect(r.numParticipaciones).toBe(3)
    expect(r.totalRentasImputadas).toBe(0)
  })

  it('combina rentas y participaciones', () => {
    const r = calcularModelo282({
      razonSocial: 'Entidad Mixta',
      nif: 'B44455566',
      tipoEntidad: 'fondo',
      rentasImputadas: [
        { tipo: 'dividendos', importeCents: 75_000 },
        { tipo: 'intereses', importeCents: 25_000 },
      ],
      participaciones: [
        { sociedad: 'Tech Corp', nif: 'B99988877', porcentaje: 5 },
      ],
    })
    expect(r.totalRentasImputadas).toBe(100_000)
    expect(r.numRentas).toBe(2)
    expect(r.numParticipaciones).toBe(1)
  })
})
