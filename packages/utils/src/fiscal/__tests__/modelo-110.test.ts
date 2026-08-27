import { describe, it, expect } from 'vitest'
import { calcularModelo110 } from '../modelo-110'

describe('calcularModelo110 — otras retenciones IRPF', () => {
  it('acumula base y retención totales de varias filas', () => {
    const r = calcularModelo110({
      periodo: 3,
      filas: [
        { tipo: 'premios', importe: 1_000, tipoRetencion: 19 },
        { tipo: 'capitalInmobiliario', importe: 2_000, tipoRetencion: 21 },
      ],
    })
    expect(r.baseTotal).toBe(3_000)
    expect(r.retencionTotal).toBeCloseTo(610, 2) // 190 + 420
    expect(r.nFilas).toBe(2)
  })

  it('calcula la retención de cada fila', () => {
    const r = calcularModelo110({
      periodo: 1,
      filas: [{ tipo: 'gananciaPatrimonial', importe: 5_000, tipoRetencion: 19 }],
    })
    expect(r.detalle[0]?.retencion).toBeCloseTo(950, 2)
    expect(r.detalle[0]?.base).toBe(5_000)
  })

  it('advierte si el tipo usado está fuera del rango habitual', () => {
    const r = calcularModelo110({
      periodo: 2,
      filas: [{ tipo: 'premios', importe: 1_000, tipoRetencion: 7 }],
    })
    expect(r.avisos.some(a => a.includes('fuera del rango'))).toBe(true)
  })

  it('informa del plazo en el resumen anual', () => {
    const r = calcularModelo110({
      periodo: 'anual',
      filas: [{ tipo: 'otros', importe: 800, tipoRetencion: 20 }],
    })
    expect(r.avisos.some(a => a.includes('30 de enero'))).toBe(true)
  })

  it('no admite importes negativos', () => {
    const r = calcularModelo110({
      periodo: 1,
      filas: [{ tipo: 'especie', importe: -100, tipoRetencion: 19 }],
    })
    expect(r.baseTotal).toBe(0)
  })
})
