import { describe, it, expect } from 'vitest'
import { calcularModelo211 } from '../modelo-211'

describe('calcularModelo211 — retención IRNR adquisición inmuebles', () => {
  it('aplica el 3% por defecto sobre el precio', () => {
    const r = calcularModelo211({ precioVenta: 200_000 })
    expect(r.retencion).toBe(6_000)
    expect(r.netoAlVendedor).toBe(194_000)
    expect(r.importeAingresar).toBe(6_000)
    expect(r.retencionAplicable).toBe(true)
  })

  it('permite un tipo de retención distinto', () => {
    const r = calcularModelo211({ precioVenta: 100_000, tipoRetencionPct: 3 })
    expect(r.retencion).toBe(3_000)
  })

  it('con espera cauta no se retiene', () => {
    const r = calcularModelo211({ precioVenta: 150_000, conEsperaCauta: true })
    expect(r.retencion).toBe(0)
    expect(r.netoAlVendedor).toBe(150_000)
    expect(r.retencionAplicable).toBe(false)
    expect(r.avisos.some((a) => a.includes('espera cauta'))).toBe(true)
  })
})
