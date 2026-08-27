import { describe, it, expect } from 'vitest'
import { calcularModelo170, TIPOS_RETENCION_MODELO_170 } from '../modelo-170'

describe('calcularModelo170 — retenciones arrendamientos urbanos', () => {
  it('aplica el 19% por defecto para arrendador persona física', () => {
    const r = calcularModelo170({ baseImponible: 10_000 })
    expect(r.tipoRetencion).toBe(19)
    expect(r.cuotaRetenida).toBe(1_900)
    expect(r.baseImponible).toBe(10_000)
  })

  it('aplica el 24% cuando el arrendatario es empresario o profesional', () => {
    const r = calcularModelo170({
      baseImponible: 5_000,
      tipoRetencionPct: TIPOS_RETENCION_MODELO_170.empresarioProfesional,
    })
    expect(r.tipoRetencion).toBe(24)
    expect(r.cuotaRetenida).toBe(1_200)
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