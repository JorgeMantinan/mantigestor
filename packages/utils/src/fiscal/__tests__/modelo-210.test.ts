import { describe, it, expect } from 'vitest'
import { calcularModelo210, TIPOS_RENTA_210 } from '../modelo-210'

describe('calcularModelo210 — IRNR no residentes', () => {
  it('renta inmobiliaria: 24% general, 19% residente UE', () => {
    const base = 100_000 // 1.000 €
    const general = calcularModelo210({
      tipoRenta: 'inmobiliaria',
      baseImponible: base,
      retencion: 0,
      gastosDeducibles: 0,
    })
    expect(general.tipoRetencion).toBe(24)
    expect(general.cuotaIntegra).toBe(Math.round(base * 24 / 100))

    const ue = calcularModelo210({
      tipoRenta: 'inmobiliaria',
      baseImponible: base,
      retencion: 0,
      gastosDeducibles: 0,
      esResidenteUe: true,
    })
    expect(ue.tipoRetencion).toBe(19)
    expect(ue.cuotaIntegra).toBe(Math.round(base * 19 / 100))
  })

  it('renta mobiliaria: 19% independientemente de la residencia', () => {
    const r = calcularModelo210({
      tipoRenta: 'mobiliaria',
      baseImponible: 100_000,
      retencion: 0,
      gastosDeducibles: 0,
      esResidenteUe: true,
    })
    expect(r.tipoRetencion).toBe(19)
    expect(r.cuotaIntegra).toBe(19_000)
  })

  it('otros rendimientos: 24%', () => {
    const r = calcularModelo210({
      tipoRenta: 'otros',
      baseImponible: 100_000,
      retencion: 0,
      gastosDeducibles: 0,
    })
    expect(r.tipoRetencion).toBe(24)
  })

  it('resta los gastos deducibles y nunca da base negativa', () => {
    const r = calcularModelo210({
      tipoRenta: 'mobiliaria',
      baseImponible: 100_000,
      gastosDeducibles: 30_000,
      retencion: 0,
    })
    expect(r.baseImponible).toBe(70_000)
    expect(r.cuotaIntegra).toBe(Math.round(70_000 * 19 / 100))

    const neg = calcularModelo210({
      tipoRenta: 'mobiliaria',
      baseImponible: 10_000,
      gastosDeducibles: 50_000,
      retencion: 0,
    })
    expect(neg.baseImponible).toBe(0)
    expect(neg.cuotaIntegra).toBe(0)
  })

  it('resultado = cuota integra − retención soportada', () => {
    const r = calcularModelo210({
      tipoRenta: 'mobiliaria',
      baseImponible: 100_000,
      retencion: 10_000,
      gastosDeducibles: 0,
    })
    expect(r.resultado).toBe(19_000 - 10_000)
  })
})
