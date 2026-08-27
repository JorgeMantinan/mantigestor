import { describe, it, expect } from 'vitest'
import { calcularModelo131, type ActividadModulo } from '../modelo-131'

function actividad(overrides: Partial<ActividadModulo>): ActividadModulo {
  return {
    concepto: 'Actividad',
    clave: 'IAE',
    unidades: 1,
    precioUnitario: 100_000,
    tipoIRPF: 19,
    ...overrides,
  }
}

describe('calcularModelo131 — IRPF módulos', () => {
  it('calcula la base como unidades × módulo unitario', () => {
    const r = calcularModelo131({
      actividades: [actividad({ unidades: 3, precioUnitario: 100_000 })],
      pagosAnteriores: 0,
    })
    expect(r.baseImponible).toBe(300_000)
  })

  it('aplica el tipo de retención a la base de cada actividad', () => {
    const r = calcularModelo131({
      actividades: [
        actividad({ unidades: 3, precioUnitario: 100_000, tipoIRPF: 19 }),
        actividad({ unidades: 1, precioUnitario: 500_000, tipoIRPF: 20 }),
      ],
      pagosAnteriores: 0,
    })
    expect(r.desglose[0]?.cuota).toBe(57_000) // 300.000 × 19%
    expect(r.desglose[1]?.cuota).toBe(100_000) // 500.000 × 20%
    expect(r.cuotaIntegra).toBe(157_000)
    expect(r.baseImponible).toBe(800_000)
  })

  it('resta los pagos fraccionados anteriores y devuelve aIngresar', () => {
    const r = calcularModelo131({
      actividades: [actividad({ unidades: 3, precioUnitario: 100_000, tipoIRPF: 19 })],
      pagosAnteriores: 50_000,
    })
    expect(r.resultado).toBe(57_000 - 50_000)
    expect(r.aIngresar).toBe(7_000)
    expect(r.aDevolver).toBe(0)
  })

  it('devuelve aDevolver cuando los pagos anteriores superan la cuota', () => {
    const r = calcularModelo131({
      actividades: [actividad({ unidades: 3, precioUnitario: 100_000, tipoIRPF: 19 })],
      pagosAnteriores: 200_000,
    })
    expect(r.aDevolver).toBe(143_000)
    expect(r.aIngresar).toBe(0)
  })

  it('sin actividades devuelve base y cuota cero', () => {
    const r = calcularModelo131({ actividades: [], pagosAnteriores: 0 })
    expect(r.baseImponible).toBe(0)
    expect(r.cuotaIntegra).toBe(0)
    expect(r.desglose).toHaveLength(0)
  })
})
