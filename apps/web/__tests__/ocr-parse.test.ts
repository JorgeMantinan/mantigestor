import { describe, it, expect } from 'vitest'
import { parseTextoTicket } from '@/lib/ocr'

const TICKET = `PANADERIA LA ESPAÑOLA
NIF: B12345678
Ticket nº TK-000456
15/03/2026
Pan batido 1,20
Leche 1L 0,95
SUBTOTAL 2,15
IVA 21% 0,45
TOTAL 2,60
`

describe('parseTextoTicket — OCR sin IA', () => {
  it('extrae total, IVA, base, fecha, NIF, número y proveedor', () => {
    const r = parseTextoTicket(TICKET)
    expect(r.total).toBe(2.6)
    expect(r.iva).toBe(21)
    expect(r.baseImponible).toBeCloseTo(2.15, 2)
    expect(r.fechaEmision).toBe('2026-03-15')
    expect(r.nifContraparte).toBe('B12345678')
    expect(r.numero).toBe('TK-000456')
    expect(r.emisorReceptor).toContain('PANADERIA')
    expect(r.tipo).toBe('gasto')
    expect(r.modelosSugeridos.length).toBeGreaterThan(0)
  })

  it('acepta formato de importe con miles (1.234,56)', () => {
    const r = parseTextoTicket(`FACTURA № F-2026-001\nTOTAL 1.234,56`)
    expect(r.total).toBe(1234.56)
  })

  it('texto vacío devuelve campos nulos sin lanzar', () => {
    const r = parseTextoTicket('')
    expect(r.total).toBeNull()
    expect(r.baseImponible).toBeNull()
    expect(r.fechaEmision).toBeNull()
    expect(r.nifContraparte).toBeNull()
    expect(r.emisorReceptor).toBeNull()
  })

  it('sin IVA pero con total, deriva la base con el 21%', () => {
    const r = parseTextoTicket('CAFETERIA CENTRO\nTOTAL 121,00\n')
    expect(r.total).toBe(121)
    // sin porcentaje localizado → base queda null (se corrige en la vista previa)
    expect(r.baseImponible).toBeNull()
  })
})
