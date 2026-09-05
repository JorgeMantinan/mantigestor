import { describe, it, expect } from 'vitest'
import { generarNumeroNC, calcularNotaCredito, calcularNotaCreditoTotal } from '../nota-credito'

describe('generarNumeroNC', () => {
  it('genera número NC correctamente', () => {
    expect(generarNumeroNC('F-2026-001')).toBe('NC-F-2026-001')
  })

  it('genera número NC para factura recibida', () => {
    expect(generarNumeroNC('R-2026-042')).toBe('NC-R-2026-042')
  })
})

describe('calcularNotaCredito', () => {
  const factura = {
    id: 'fact-123',
    numero: 'F-2026-001',
    emisorReceptor: 'Cliente S.L.',
    nifContraparte: 'B12345678',
    fechaEmision: '2026-01-15',
    baseImponible: 100000, // 1000€
    iva: 21000, // 210€
    total: 121000, // 1210€
  }

  it('calcula NC parcial (50%)', () => {
    const nc = calcularNotaCredito(factura, 50)

    expect(nc.baseImponible).toBe(50000)
    expect(nc.iva).toBe(10500)
    expect(nc.total).toBe(60500)
    expect(nc.motivo).toContain('50%')
  })

  it('calcula NC total (100%)', () => {
    const nc = calcularNotaCredito(factura, 100)

    expect(nc.baseImponible).toBe(100000)
    expect(nc.iva).toBe(21000)
    expect(nc.total).toBe(121000)
  })

  it('calcula NC mínima (1%)', () => {
    const nc = calcularNotaCredito(factura, 1)

    expect(nc.baseImponible).toBe(1000)
    expect(nc.iva).toBe(210)
    expect(nc.total).toBe(1210)
  })
})

describe('calcularNotaCreditoTotal', () => {
  it('genera NC total con todos los importes', () => {
    const factura = {
      id: 'fact-456',
      numero: 'F-2026-099',
      emisorReceptor: 'Proveedor X',
      nifContraparte: 'B99999999',
      fechaEmision: '2026-03-01',
      baseImponible: 50000,
      iva: 10500,
      total: 60500,
    }

    const nc = calcularNotaCreditoTotal(factura)

    expect(nc.facturaOriginalId).toBe('fact-456')
    expect(nc.baseImponible).toBe(50000)
    expect(nc.iva).toBe(10500)
    expect(nc.total).toBe(60500)
    expect(nc.motivo).toContain('devolución')
  })
})
