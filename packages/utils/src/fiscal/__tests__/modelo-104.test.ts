import { describe, it, expect } from 'vitest'
import { calcularModelo104 } from '../modelo-104'

describe('calcularModelo104 — devolución acelerada familias numerosas', () => {
  it('calcula una cuota mensual a partir de la devolución estimada', () => {
    const r = calcularModelo104({
      categoria: 'general',
      numHijos: 2,
      retencionesAnuales: 6_000,
      rendimientosBrutos: 24_000,
    })
    expect(r.devolucionEstimada).toBeGreaterThan(0)
    expect(r.mensualSolicitable).toBeGreaterThan(0)
    expect(r.mensualSolicitable).toBeLessThanOrEqual(r.capMensual)
  })

  it('una familia numerosa especial genera un mayor mínimo por descendientes', () => {
    const general = calcularModelo104({ categoria: 'general', numHijos: 3, retencionesAnuales: 5_000 })
    const especial = calcularModelo104({ categoria: 'especial', numHijos: 3, retencionesAnuales: 5_000 })
    expect(especial.minimoBase).toBeGreaterThan(general.minimoBase)
  })

  it('sin retenciones devuelve no elegible', () => {
    const r = calcularModelo104({ categoria: 'general', numHijos: 1, retencionesAnuales: 0 })
    expect(r.esElegible).toBe(false)
    expect(r.mensualSolicitable).toBe(0)
  })

  it('el mínimo por discapacidad a cargo es elevado', () => {
    const r = calcularModelo104({ categoria: 'discapacidad', numHijos: 1, retencionesAnuales: 4_000 })
    expect(r.minimoBase).toBe(9_000)
  })
})
