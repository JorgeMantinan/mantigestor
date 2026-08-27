import { describe, it, expect } from 'vitest'
import { calcularModelo117 } from '../modelo-117'

describe('calcularModelo117 — retenciones actividades agrícolas y ganaderas', () => {
  it('acumula base y retención totales', () => {
    const r = calcularModelo117({
      periodo: 2,
      filas: [
        { tipo: 'madera', importe: 4_000, tipoRetencion: 1 },
        { tipo: 'ganadoIbericoOriginario', importe: 2_000, tipoRetencion: 2 },
      ],
    })
    expect(r.baseTotal).toBe(6_000)
    // 40 + 40 = 80
    expect(r.retencionTotal).toBeCloseTo(80, 2)
  })

  it('calcula la retención del 1% y 2% según procedencia', () => {
    const uno = calcularModelo117({ periodo: 1, filas: [{ tipo: 'productosLacteosOrigen', importe: 5_000, tipoRetencion: 2 }] })
    expect(uno.retencionTotal).toBeCloseTo(100, 2)
    const dos = calcularModelo117({ periodo: 1, filas: [{ tipo: 'ganadoOtro', importe: 5_000, tipoRetencion: 1 }] })
    expect(dos.retencionTotal).toBeCloseTo(50, 2)
  })

  it('advierte si el tipo no coincide con el habitual', () => {
    const r = calcularModelo117({ periodo: 3, filas: [{ tipo: 'madera', importe: 1_000, tipoRetencion: 7 }] })
    expect(r.avisos.some(a => a.includes('1%'))).toBe(true)
  })

  it('informa del plazo anual', () => {
    const r = calcularModelo117({ periodo: 'anual', filas: [{ tipo: 'especie', importe: 900, tipoRetencion: 1 }] })
    expect(r.avisos.some(a => a.includes('30 de enero'))).toBe(true)
  })
})
