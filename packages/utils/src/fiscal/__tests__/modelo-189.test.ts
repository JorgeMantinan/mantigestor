import { describe, it, expect } from 'vitest'
import { calcularModelo189 } from '../modelo-189'

describe('calcularModelo189 — rentas exentas', () => {
  it('devuelve ceros con array vacío', () => {
    const r = calcularModelo189([])
    expect(r.totalRentasExentasCents).toBe(0)
    expect(r.numBeneficiarios).toBe(0)
    expect(r.numRentas).toBe(0)
    expect(r.desglosePorTipo).toHaveLength(0)
  })

  it('calcula una renta exenta individual', () => {
    const r = calcularModelo189([
      { beneficiario: 'Pedro López', nif: '11111111A', tipoRenta: 'beca', importeCents: 30000, descripcion: 'Beca universitaria' },
    ])
    expect(r.totalRentasExentasCents).toBe(30000)
    expect(r.numBeneficiarios).toBe(1)
    expect(r.numRentas).toBe(1)
    expect(r.desglosePorTipo).toHaveLength(1)
    expect(r.desglosePorTipo[0]).toEqual({ tipoRenta: 'beca', numBeneficiarios: 1, numRentas: 1, totalImporteCents: 30000 })
  })

  it('agrupa rentas de diferentes tipos', () => {
    const r = calcularModelo189([
      { beneficiario: 'Ana', nif: 'A1', tipoRenta: 'beca', importeCents: 20000, descripcion: 'Beca' },
      { beneficiario: 'Luis', nif: 'L1', tipoRenta: 'invalidez', importeCents: 40000, descripcion: 'Prestación invalidez' },
      { beneficiario: 'María', nif: 'M1', tipoRenta: 'pension', importeCents: 60000, descripcion: 'Pensión jubilación' },
      { beneficiario: 'Carlos', nif: 'C1', tipoRenta: 'beca', importeCents: 15000, descripcion: 'Beca máster' },
    ])
    expect(r.numBeneficiarios).toBe(4)
    expect(r.numRentas).toBe(4)
    expect(r.totalRentasExentasCents).toBe(135000)
    expect(r.desglosePorTipo).toHaveLength(3)

    const becas = r.desglosePorTipo.find((d) => d.tipoRenta === 'beca')!
    expect(becas.numRentas).toBe(2)
    expect(becas.totalImporteCents).toBe(35000)
  })

  it('cuenta beneficiarios únicos correctamente', () => {
    const r = calcularModelo189([
      { beneficiario: 'Ana', nif: 'A1', tipoRenta: 'beca', importeCents: 10000, descripcion: 'Beca 1' },
      { beneficiario: 'Ana', nif: 'A1', tipoRenta: 'ayuda_publica', importeCents: 5000, descripcion: 'Ayuda' },
      { beneficiario: 'Luis', nif: 'L1', tipoRenta: 'invalidez', importeCents: 25000, descripcion: 'Invalidez' },
    ])
    expect(r.numBeneficiarios).toBe(2)
    expect(r.numRentas).toBe(3)
    expect(r.totalRentasExentasCents).toBe(40000)
  })
})
