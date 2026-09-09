import { describe, it, expect } from 'vitest'
import { calcularModelo720, type BienExtranjero } from '../modelo-720'

function bien(overrides: Partial<BienExtranjero>): BienExtranjero {
  return {
    id: '1',
    tipo: 'cuentas',
    pais: 'Suiza',
    descripcion: 'Cuenta bancaria UBS',
    valor: 100_000,
    ...overrides,
  }
}

describe('calcularModelo720', () => {
  it('no es obligatorio si valor total <= 50.000€', () => {
    const res = calcularModelo720({
      bienes: [
        bien({ tipo: 'cuentas', pais: 'Suiza', valor: 30_000 }),
        bien({ tipo: 'valores', pais: 'UK', valor: 20_000 }),
      ],
    })

    expect(res.obligatorio).toBe(false)
    expect(res.valorTotal).toBe(50_000)
    expect(res.totalCuentas).toBe(30_000)
    expect(res.totalValores).toBe(20_000)
  })

  it('es obligatorio si valor total > 50.000€', () => {
    const res = calcularModelo720({
      bienes: [
        bien({ tipo: 'cuentas', pais: 'Suiza', valor: 40_000 }),
        bien({ tipo: 'valores', pais: 'UK', valor: 15_000 }),
      ],
    })

    expect(res.obligatorio).toBe(true)
    expect(res.valorTotal).toBe(55_000)
  })

  it('clasifica bienes por tipo', () => {
    const res = calcularModelo720({
      bienes: [
        bien({ tipo: 'cuentas', valor: 100_000 }),
        bien({ tipo: 'valores', valor: 200_000 }),
        bien({ tipo: 'inmuebles', valor: 300_000 }),
        bien({ tipo: 'otros', valor: 50_000 }),
      ],
    })

    expect(res.totalCuentas).toBe(100_000)
    expect(res.totalValores).toBe(200_000)
    expect(res.totalInmuebles).toBe(300_000)
    expect(res.totalOtros).toBe(50_000)
    expect(res.valorTotal).toBe(650_000)
  })

  it('agrupa valores por país', () => {
    const res = calcularModelo720({
      bienes: [
        bien({ pais: 'Suiza', valor: 100_000 }),
        bien({ pais: 'Suiza', valor: 50_000 }),
        bien({ pais: 'UK', valor: 80_000 }),
      ],
    })

    expect(res.porPais['Suiza']).toBe(150_000)
    expect(res.porPais['UK']).toBe(80_000)
  })

  it('sin bienes devuelve todo a cero', () => {
    const res = calcularModelo720({ bienes: [] })

    expect(res.valorTotal).toBe(0)
    expect(res.obligatorio).toBe(false)
    expect(res.totalCuentas).toBe(0)
    expect(res.totalValores).toBe(0)
    expect(res.totalInmuebles).toBe(0)
    expect(res.totalOtros).toBe(0)
  })

  it('múltiples bienes del mismo tipo se acumulan', () => {
    const res = calcularModelo720({
      bienes: [
        bien({ tipo: 'cuentas', pais: 'Suiza', valor: 30_000 }),
        bien({ tipo: 'cuentas', pais: 'UK', valor: 25_000 }),
      ],
    })

    expect(res.totalCuentas).toBe(55_000)
    expect(res.valorTotal).toBe(55_000)
    expect(res.obligatorio).toBe(true)
  })

  it('frontera exacta de 50.000€ no es obligatorio', () => {
    const res = calcularModelo720({
      bienes: [bien({ tipo: 'cuentas', valor: 50_000 })],
    })

    expect(res.obligatorio).toBe(false)
  })

  it('50.001€ sí es obligatorio', () => {
    const res = calcularModelo720({
      bienes: [bien({ tipo: 'cuentas', valor: 50_001 })],
    })

    expect(res.obligatorio).toBe(true)
  })
})
