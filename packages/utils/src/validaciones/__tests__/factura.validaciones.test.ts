import { describe, it, expect } from 'vitest'
import { FacturaSchema } from '../factura.validaciones'

const facturaValida = {
  tipo: 'ingreso' as const,
  numero: 'F-2026-001',
  emisorReceptor: 'Cliente Ejemplo S.L.',
  nifContraparte: 'B12345678',
  fechaEmision: '2026-03-15',
  baseImponible: 100000, // céntimos
  iva: 21,
  total: 121000,
  estado: 'pendiente' as const,
}

describe('FacturaSchema', () => {
  it('acepta una factura válida', () => {
    const result = FacturaSchema.safeParse(facturaValida)
    expect(result.success).toBe(true)
  })

  it('aplica el estado por defecto "pendiente"', () => {
    const { estado: _estado, ...sinEstado } = facturaValida
    const result = FacturaSchema.safeParse(sinEstado)
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.estado).toBe('pendiente')
  })

  it('rechaza un tipo desconocido', () => {
    const result = FacturaSchema.safeParse({ ...facturaValida, tipo: 'alquiler' })
    expect(result.success).toBe(false)
  })

  it('rechaza un NIF de longitud incorrecta', () => {
    const result = FacturaSchema.safeParse({ ...facturaValida, nifContraparte: 'B1234567' })
    expect(result.success).toBe(false)
  })

  it('acepta un NIF con letras en minúsculas', () => {
    const result = FacturaSchema.safeParse({ ...facturaValida, nifContraparte: 'b12345678' })
    expect(result.success).toBe(true)
  })

  it('acepta los campos opcionales de la BD (empresaId, notasPrivadas, deducible, descuento)', () => {
    const result = FacturaSchema.safeParse({
      ...facturaValida,
      empresaId: 'emp-1',
      notasPrivadas: 'Gestor: revisar',
      deducible: false,
      descuentoPorcentaje: 10,
    })
    expect(result.success).toBe(true)
  })

  it('rechaza un descuentoPorcentaje fuera de rango', () => {
    const result = FacturaSchema.safeParse({ ...facturaValida, descuentoPorcentaje: 150 })
    expect(result.success).toBe(false)
  })

  it('rechaza un IVA que no sea 0, 4, 10 o 21', () => {
    const result = FacturaSchema.safeParse({ ...facturaValida, iva: 15 })
    expect(result.success).toBe(false)
  })

  it('rechaza una fecha futura', () => {
    const result = FacturaSchema.safeParse({ ...facturaValida, fechaEmision: '2099-01-01' })
    expect(result.success).toBe(false)
  })

  it('rechaza importes no enteros (deben ir en céntimos)', () => {
    const result = FacturaSchema.safeParse({ ...facturaValida, baseImponible: 100.5 })
    expect(result.success).toBe(false)
  })

  it('rechaza importes negativos', () => {
    const result = FacturaSchema.safeParse({ ...facturaValida, baseImponible: -1000 })
    expect(result.success).toBe(false)
  })

  it('rechaza un estado fuera del enum', () => {
    const result = FacturaSchema.safeParse({ ...facturaValida, estado: 'borrador' })
    expect(result.success).toBe(false)
  })
})
