import { describe, it, expect } from 'vitest'
import { calcularModelo182 } from '../modelo-182'

describe('calcularModelo182 — donatarias y donatarios', () => {
  it('devuelve ceros con array vacío', () => {
    const r = calcularModelo182([])
    expect(r.totalDonacionesCents).toBe(0)
    expect(r.totalDeduccionesCents).toBe(0)
    expect(r.numDonantes).toBe(0)
    expect(r.numDonaciones).toBe(0)
    expect(r.desglosePorCCAA).toHaveLength(0)
  })

  it('calcula una única donación correctamente', () => {
    const r = calcularModelo182([
      { donante: 'Juan Pérez', nifDonante: '12345678A', ccaaDonante: 'Madrid', importeDonacionesCents: 50000, importeDeduccionCents: 15000 },
    ])
    expect(r.totalDonacionesCents).toBe(50000)
    expect(r.totalDeduccionesCents).toBe(15000)
    expect(r.numDonantes).toBe(1)
    expect(r.numDonaciones).toBe(1)
    expect(r.desglosePorCCAA).toHaveLength(1)
    expect(r.desglosePorCCAA[0]).toEqual({ ccaa: 'Madrid', numDonaciones: 1, totalImporteCents: 50000, totalDeduccionCents: 15000 })
  })

  it('agrupa donaciones por comunidad autónoma', () => {
    const r = calcularModelo182([
      { donante: 'Ana', nifDonante: 'A1', ccaaDonante: 'Madrid', importeDonacionesCents: 10000, importeDeduccionCents: 3000 },
      { donante: 'Luis', nifDonante: 'L1', ccaaDonante: 'Cataluña', importeDonacionesCents: 20000, importeDeduccionCents: 6000 },
      { donante: 'María', nifDonante: 'M1', ccaaDonante: 'Madrid', importeDonacionesCents: 15000, importeDeduccionCents: 4500 },
    ])
    expect(r.numDonantes).toBe(3)
    expect(r.numDonaciones).toBe(3)
    expect(r.desglosePorCCAA).toHaveLength(2)

    const madrid = r.desglosePorCCAA.find((d) => d.ccaa === 'Madrid')!
    expect(madrid.numDonaciones).toBe(2)
    expect(madrid.totalImporteCents).toBe(25000)
    expect(madrid.totalDeduccionCents).toBe(7500)

    const cataluña = r.desglosePorCCAA.find((d) => d.ccaa === 'Cataluña')!
    expect(cataluña.numDonaciones).toBe(1)
    expect(cataluña.totalImporteCents).toBe(20000)
  })

  it('suma totales correctamente con múltiples donaciones', () => {
    const r = calcularModelo182([
      { donante: 'A', nifDonante: 'A1', ccaaDonante: 'Andalucía', importeDonacionesCents: 100000, importeDeduccionCents: 25000 },
      { donante: 'B', nifDonante: 'B1', ccaaDonante: 'Andalucía', importeDonacionesCents: 50000, importeDeduccionCents: 12500 },
      { donante: 'C', nifDonante: 'C1', ccaaDonante: 'Valencia', importeDonacionesCents: 75000, importeDeduccionCents: 18750 },
    ])
    expect(r.totalDonacionesCents).toBe(225000)
    expect(r.totalDeduccionesCents).toBe(56250)
    expect(r.numDonaciones).toBe(3)
  })
})
