import { describe, it, expect } from 'vitest'
import { calcularModelo117, TIPO_RETENCION_IIC, type Fila117 } from '../modelo-117'

function fila(overrides: Partial<Fila117>): Fila117 {
  return {
    concepto: 'reembolso',
    nif: 'A-12345678',
    descripcion: 'Fondo Demostración FI',
    contraprestacionCents: 250_000,
    adquisicionCents: 200_000,
    ...overrides,
  }
}

describe('calcularModelo117 — IIC (fondos de inversión)', () => {
  it('retiene el 19% sobre la ganancia del reembolso', () => {
    expect(TIPO_RETENCION_IIC).toBe(19)
    const res = calcularModelo117({ periodo: 1, filas: [fila({})] })
    expect(res.baseTotal).toBe(50_000)
    expect(res.retencionTotal).toBe(9_500)
    expect(res.detalle[0]?.retencion).toBe(9_500)
  })

  it('sin ganancia (pérdida) no retiene y avisa (art. 94.1.a LIRPF)', () => {
    const res = calcularModelo117({
      periodo: 2,
      filas: [fila({ contraprestacionCents: 100_000, adquisicionCents: 150_000 })],
    })
    expect(res.baseTotal).toBe(0)
    expect(res.retencionTotal).toBe(0)
    expect(res.avisos.some(a => a.includes('94.1.a'))).toBe(true)
  })

  it('en la transmisión de derechos de suscripción retiene sobre el importe íntegro', () => {
    const res = calcularModelo117({
      periodo: 3,
      filas: [fila({ concepto: 'derechosSuscripcion', contraprestacionCents: 100_000, adquisicionCents: 0 })],
    })
    expect(res.baseTotal).toBe(100_000)
    expect(res.retencionTotal).toBe(19_000)
  })

  it('acumula varias operaciones y avisa en el resumen anual', () => {
    const res = calcularModelo117({
      periodo: 'anual',
      filas: [fila({ contraprestacionCents: 300_000, adquisicionCents: 200_000 }), fila({ nif: 'B-87654321' })],
    })
    expect(res.detalle.length).toBe(2)
    expect(res.retencionTotal).toBe(19_000 + 9_500)
    expect(res.avisos.some(a => a.includes('190'))).toBe(true)
  })
})
