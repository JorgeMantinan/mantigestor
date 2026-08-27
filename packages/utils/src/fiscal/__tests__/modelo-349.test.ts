import { describe, it, expect } from 'vitest'
import { calcularModelo349, type OperacionIntracomunitaria } from '../modelo-349'

function op(overrides: Partial<OperacionIntracomunitaria>): OperacionIntracomunitaria {
  return {
    tercero: 'Empresa UE',
    nif: 'DE000000000',
    pais: 'Alemania',
    tipo: 'entrega',
    baseImponible: 100_000,
    ...overrides,
  }
}

describe('calcularModelo349 — operaciones intracomunitarias', () => {
  it('agrega totales por tipo (entregas, adquisiciones, servicios)', () => {
    const r = calcularModelo349({
      operaciones: [
        op({ tipo: 'entrega', baseImponible: 100_000 }),
        op({ tipo: 'entrega', baseImponible: 50_000 }),
        op({ tipo: 'adquisicion', baseImponible: 80_000 }),
        op({ tipo: 'servicios', baseImponible: 20_000 }),
      ],
      periodo: 'trimestral',
    })
    expect(r.totalEntregas).toBe(150_000)
    expect(r.totalAdquisiciones).toBe(80_000)
    expect(r.totalServicios).toBe(20_000)
    expect(r.numOperaciones).toBe(4)
    expect(r.debePresentar).toBe(true)
  })

  it('agrupa por país', () => {
    const r = calcularModelo349({
      operaciones: [
        op({ pais: 'Alemania', tipo: 'entrega', baseImponible: 100_000 }),
        op({ pais: 'Francia', tipo: 'entrega', baseImponible: 50_000 }),
        op({ pais: 'Alemania', tipo: 'adquisicion', baseImponible: 30_000 }),
      ],
      periodo: 'mensual',
    })
    expect(r.porPais['Alemania']?.entregas).toBe(100_000)
    expect(r.porPais['Alemania']?.adquisiciones).toBe(30_000)
    expect(r.porPais['Francia']?.entregas).toBe(50_000)
    expect(r.porPais['Francia']?.adquisiciones).toBe(0)
  })

  it('sin operaciones no es obligatorio presentar', () => {
    const r = calcularModelo349({ operaciones: [], periodo: 'trimestral' })
    expect(r.numOperaciones).toBe(0)
    expect(r.debePresentar).toBe(false)
    expect(r.porPais).toEqual({})
  })
})
