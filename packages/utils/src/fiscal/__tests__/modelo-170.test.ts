import { describe, it, expect } from 'vitest'
import { calcularModelo170, TIPOS_RETENCION_MODELO_170 } from '../modelo-170'

describe('calcularModelo170 — retenciones agrupadas (modelo 170)', () => {
  it('aplica el 19% por defecto (resto de conceptos)', () => {
    const r = calcularModelo170({ baseImponible: 10_000 })
    expect(r.tipoRetencion).toBe(19)
    expect(r.cuotaRetenida).toBe(1_900)
    expect(r.baseImponible).toBe(10_000)
  })

  it('aplica el 24% a la cesión de derechos de imagen', () => {
    const r = calcularModelo170({
      baseImponible: 5_000,
      tipoRetencionPct: TIPOS_RETENCION_MODELO_170.cesionImagen,
    })
    expect(r.tipoRetencion).toBe(24)
    expect(r.cuotaRetenida).toBe(1_200)
  })

  it('aplica el 7% a profesionales de nuevo inicio', () => {
    const r = calcularModelo170({
      baseImponible: 20_000,
      tipoRetencionPct: TIPOS_RETENCION_MODELO_170.profesionalNuevoInicio,
    })
    expect(r.tipoRetencion).toBe(7)
    expect(r.cuotaRetenida).toBeCloseTo(1_400, 9)
  })

  it('devuelve cuota cero con base cero', () => {
    const r = calcularModelo170({ baseImponible: 0 })
    expect(r.cuotaRetenida).toBe(0)
  })

  it('acepta un tipo configurable distinto a los habituales', () => {
    const r = calcularModelo170({ baseImponible: 8_000, tipoRetencionPct: 15 })
    expect(r.tipoRetencion).toBe(15)
    expect(r.cuotaRetenida).toBe(1_200)
  })

  it('no redondea el resultado de la cuota', () => {
    const r = calcularModelo170({ baseImponible: 1_234.56, tipoRetencionPct: 19 })
    expect(r.cuotaRetenida).toBeCloseTo(234.5664, 4)
  })
})