import { describe, it, expect } from 'vitest'
import { calcularModelo115, type InmuebleArrendado } from '../modelo-115'

function inmueble(overrides: Partial<InmuebleArrendado>): InmuebleArrendado {
  return {
    direccion: 'C/ Ejemplo 1',
    nifArrendatario: 'B00000000',
    baseImponible: 100_000, // 1.000 € en céntimos
    retencionPct: 19,
    ...overrides,
  }
}

describe('calcularModelo115 — retenciones arrendamientos urbanos', () => {
  it('aplica la retención del 19% sobre cada renta', () => {
    const r = calcularModelo115({
      inmuebles: [inmueble({ baseImponible: 100_000 })],
      trimestre: 1,
    })
    expect(r.desglose[0]?.retencion).toBe(19_000)
    expect(r.totalRetenciones).toBe(19_000)
    expect(r.totalBaseImponible).toBe(100_000)
  })

  it('agrega el total de varios inmuebles', () => {
    const r = calcularModelo115({
      inmuebles: [
        inmueble({ baseImponible: 100_000 }),
        inmueble({ baseImponible: 200_000, nifArrendatario: 'C00000000' }),
      ],
      trimestre: 2,
    })
    expect(r.totalBaseImponible).toBe(300_000)
    expect(r.totalRetenciones).toBe(57_000) // (100.000 + 200.000) × 19%
    expect(r.numInmuebles).toBe(2)
    expect(r.trimestre).toBe(2)
  })

  it('respeta un tipo de retención personalizado', () => {
    const r = calcularModelo115({
      inmuebles: [inmueble({ baseImponible: 100_000, retencionPct: 25 })],
      trimestre: 1,
    })
    expect(r.totalRetenciones).toBe(25_000)
  })
})
