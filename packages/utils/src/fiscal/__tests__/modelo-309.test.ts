import { describe, it, expect } from 'vitest'
import { calcularModelo309, MOTIVOS_309, type DatosModelo309 } from '../modelo-309'

describe('calcularModelo309 — IVA declaración-liquidación no periódica', () => {
  it('liquida operaciones devengadas y soportadas por tipo', () => {
    const datos: DatosModelo309 = {
      motivo: 'operacionNoPeriodica',
      operaciones: [
        { tipo: 21, baseCents: 1_000_000 }, // devengada → cuota 210.000
        { tipo: 10, baseCents: 500_000 }, // devengada → cuota 50.000
        { tipo: 21, baseCents: -200_000 }, // soportada → cuota 42.000
      ],
    }
    const res = calcularModelo309(datos)
    expect(res.baseDevengadaCents).toBe(1_500_000)
    expect(res.cuotaDevengadaCents).toBe(260_000)
    expect(res.baseSoportadaCents).toBe(200_000)
    expect(res.cuotaSoportadaCents).toBe(42_000)
    expect(res.liquidacionCents).toBe(218_000)
    expect(res.resultadoCents).toBe(218_000)
    expect(res.esRectificativa).toBe(false)
  })

  it('como rectificativa del 303 exige ejercicio/periodo original y resta su resultado', () => {
    const datos: DatosModelo309 = {
      motivo: 'rectificativa303',
      ejercicioOriginal: 2026,
      periodoOriginal: 'T1',
      resultadoOriginalCents: 150_000,
      operaciones: [{ tipo: 21, baseCents: 1_000_000 }],
    }
    const res = calcularModelo309(datos)
    expect(res.esRectificativa).toBe(true)
    expect(res.etiquetaMotivo).toBe(MOTIVOS_309.rectificativa303)
    expect(res.ejercicioOriginal).toBe(2026)
    expect(res.periodoOriginal).toBe('T1')
    expect(res.diferenciaCents).toBe(60_000) // 210.000 − 150.000
    expect(res.resultadoCents).toBe(60_000)
    expect(res.avisos.length).toBe(0)
  })

  it('avisa si a la rectificativa le falta el ejercicio o el periodo original', () => {
    const res = calcularModelo309({ motivo: 'rectificativa303', operaciones: [] })
    expect(res.avisos.some(a => a.includes('autoliquidación'))).toBe(true)
  })

  it('acepta cuotas fijas sobre la base', () => {
    const res = calcularModelo309({
      motivo: 'otro',
      operaciones: [{ tipo: 21, baseCents: 100_000, cuotaCents: 21_000 }],
    })
    expect(res.cuotaDevengadaCents).toBe(21_000)
  })

  it('descuenta las deducciones/regularizaciones de la liquidación', () => {
    const res = calcularModelo309({
      motivo: 'operacionNoPeriodica',
      deduccionesCents: 10_000,
      operaciones: [{ tipo: 21, baseCents: 100_000 }],
    })
    expect(res.liquidacionCents).toBe(11_000) // 21.000 − 10.000
    expect(res.deduccionesCents).toBe(10_000)
  })
})
