import { describe, it, expect } from 'vitest'
import { calcularPresupuestoAnual } from '../presupuesto-anual'
import { calcularModelo303 } from '../modelo-303'

const facturaIngreso21 = (importe: number, iva: number): Parameters<typeof calcularModelo303>[0][number] => ({
  tipo: 'ingreso',
  importe,
  iva,
  importeIva: Math.round(importe * (iva / 100)),
  deducible: false,
})

describe('calcularPresupuestoAnual', () => {
  const t1 = [facturaIngreso21(100_000, 21)] // base 1000 €, iva 210 €
  const t2 = [facturaIngreso21(100_000, 21)]

  it('usa los resultados reales de los trimestres transcurridos', () => {
    const r = calcularPresupuestoAnual({
      facturasPorTrimestre: [t1, t2, [], []],
      anio: 2026,
      trimestreActual: 2,
      retencionesTrabajoCents: 40_000,
    })
    expect(r.trimestres.length).toBe(4)
    expect(r.trimestres[0]?.real).toBe(true)
    expect(r.trimestres[0]?.cuotaIva).toBe(21_000) // 21000 céntimos = 210 €
    expect(r.trimestres[2]?.real).toBe(false)
  })

  it('proyecta los trimestres futuros a partir de la media de los reales', () => {
    const r = calcularPresupuestoAnual({
      facturasPorTrimestre: [t1, [], [], []],
      anio: 2026,
      trimestreActual: 1,
    })
    // Q1 real: cuota 21.000. Futuros: ~ ×1.06
    const futuro = r.trimestres[1]?.cuotaIva ?? 0
    expect(futuro).toBeGreaterThan(0)
    expect(futuro).toBeLessThan(23_000)
  })

  it('reparte las retenciones IRPF a prorrata trimestral', () => {
    const r = calcularPresupuestoAnual({
      facturasPorTrimestre: [t1, t2, [], []],
      anio: 2026,
      trimestreActual: 4,
      retencionesTrabajoCents: 40_000,
    })
    expect(r.totalRetencionesIrpf).toBeCloseTo(40_000, 0)
    expect(r.trimestres[0]?.retencionesIrpf).toBeCloseTo(10_000, 0)
  })

  it('si no hay datos en los trimestres reales, la proyección parte de cero', () => {
    const r = calcularPresupuestoAnual({
      facturasPorTrimestre: [[], [], [], []],
      anio: 2026,
      trimestreActual: 1,
    })
    expect(r.totalIva).toBe(0)
    expect(r.avisos.some(a => a.includes('parte de cero'))).toBe(true)
  })
})
