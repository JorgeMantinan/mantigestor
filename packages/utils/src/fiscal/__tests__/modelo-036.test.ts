import { describe, it, expect } from 'vitest'
import { calcularModelo036 } from '../modelo-036'

describe('calcularModelo036 — alta censal', () => {
  it('recomienda IVA simplificado por debajo de 250.000 €', () => {
    const r = calcularModelo036({ volumenOperaciones: 120_000 })
    expect(r.ivsimplificado).toBe(true)
    expect(r.regimenRecomendado).toBe('simplificado')
  })

  it('recomienda IVA general por encima de 250.000 €', () => {
    const r = calcularModelo036({ volumenOperaciones: 400_000 })
    expect(r.ivsimplificado).toBe(false)
    expect(r.regimenRecomendado).toBe('general')
  })

  it('una actividad profesional siempre usa IVA general', () => {
    const r = calcularModelo036({ volumenOperaciones: 80_000, tipoActividad: 'profesional' })
    expect(r.regimenRecomendado).toBe('general')
  })

  it('calcula la cuota RETA con el tipo de 2026 sobre la base', () => {
    const r = calcularModelo036({ volumenOperaciones: 50_000, baseCotizacion: 1_600, mesesTarifaPlana: 0 })
    // 1600 × 0,315 = 504 (tipo RETA 2026)
    expect(r.cuotaRETA).toBe(504) // 1600 × 0,315 (2026)
    expect(r.tarifaPlana).toBe(0)
  })

  it('acumula la tarifa plana por los meses indicados', () => {
    const r = calcularModelo036({ volumenOperaciones: 50_000, baseCotizacion: 1_000, mesesTarifaPlana: 5 })
    expect(r.tarifaPlana).toBe(443.2) // 5 × 88,64 (80 + MEI 2026)
  })

  it('todos los que no superan 1M€ están exentos de IAE pero comienzan con exención de IAE declarada', () => {
    const r = calcularModelo036({ volumenOperaciones: 600_000 })
    expect(r.esActividadEconomicaIae).toBe(true)
  })

  it('genera un resumen de pasos del alta censal', () => {
    const r = calcularModelo036({ volumenOperaciones: 90_000, baseCotizacion: 1_200 })
    expect(r.resumenAlta.length).toBeGreaterThanOrEqual(4)
    expect(r.resumenAlta[0]?.titulo).toBe('Régimen de IVA')
  })
})
