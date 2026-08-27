import { describe, it, expect } from 'vitest'
import { calcularModelo590 } from '../modelo-590'

describe('calcularModelo590 — operaciones vinculadas', () => {
  it('no obliga a presentar con operaciones por debajo del umbral individual', () => {
    const r = calcularModelo590({
      cifraNegocios: 500_000,
      operaciones: [
        { tipo: 'servicios', importe: 100_000 },
        { tipo: 'venta_bienes', importe: 80_000 },
      ],
    })
    expect(r.debePresentar).toBe(false)
    expect(r.debeDocumentar).toBe(false)
    expect(r.totalOperaciones).toBe(180_000)
  })

  it('obliga a presentar cuando una operación vinculada supera 250.000 €', () => {
    const r = calcularModelo590({
      cifraNegocios: 500_000,
      operaciones: [{ tipo: 'servicios', importe: 300_000 }],
    })
    expect(r.debePresentar).toBe(true)
    expect(r.debeDocumentar).toBe(false) // cifra de negocios < 10M
  })

  it('exige documentación individual con cifra de negocios ≥ 10M y operación > 250.000', () => {
    const r = calcularModelo590({
      cifraNegocios: 12_000_000,
      operaciones: [{ tipo: 'financieras', importe: 400_000 }],
    })
    expect(r.debePresentar).toBe(true)
    expect(r.debeDocumentar).toBe(true)
  })

  it('agrega las operaciones por tipo', () => {
    const r = calcularModelo590({
      cifraNegocios: 2_000_000,
      operaciones: [
        { tipo: 'servicios', importe: 50_000 },
        { tipo: 'servicios', importe: 30_000 },
        { tipo: 'venta_bienes', importe: 20_000 },
      ],
    })
    const servicios = r.porTipo.find((p) => p.tipo === 'servicios')
    expect(servicios?.importe).toBe(80_000)
    expect(r.totalOperaciones).toBe(100_000)
  })
})
