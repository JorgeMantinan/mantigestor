import { describe, it, expect } from 'vitest'
import { calcularModelo100, type DatosModelo100 } from '../modelo-100'

function datos(overrides: Partial<DatosModelo100>): DatosModelo100 {
  return {
    baseImponibleGeneral: 0,
    baseImponibleAhorro: 0,
    reduccionTrabajo: 0,
    reduccionAhorro: 0,
    minimoPersonalFamiliar: 0,
    deduccionesAutonomicas: 0,
    pagosFraccionados: 0,
    retenciones: 0,
    dividendosIRPF: 0,
    ...overrides,
  }
}

describe('calcularModelo100 — escala progresiva base general', () => {
  it('2025: 12.450 € al 19% (estatal+autonómico combinado)', () => {
    const r = calcularModelo100(datos({ baseImponibleGeneral: 1_245_000 }))
    expect(r.cuotaIntegra).toBe(Math.round(12450 * 100 * 0.19))
  })

  it('2025: base 30.000 € aplica los tramos 19/21/23 correctamente', () => {
    const r = calcularModelo100(datos({ baseImponibleGeneral: 3_000_000 }))
    const esperado =
      Math.round(12450 * 100 * 0.19) +
      Math.round(7750 * 100 * 0.21) +
      Math.round((30000 - 20200) * 100 * 0.23)
    expect(r.cuotaIntegra).toBe(esperado)
    expect(r.cuotaIntegra).toBe(624_700)
  })

  it('2025: 31.000 € supera el tramo del 25% a partir de 35.200€ no aplica', () => {
    const r = calcularModelo100(datos({ baseImponibleGeneral: 3_100_000 }))
    // 0-12450 @19, 12450-20200 @21, 20200-31000 @23
    const esperado =
      Math.round(12450 * 100 * 0.19) +
      Math.round(7750 * 100 * 0.21) +
      Math.round((31000 - 20200) * 100 * 0.23)
    expect(r.cuotaIntegra).toBe(esperado)
  })
})

describe('calcularModelo100 — base del ahorro (art. 63 LIRPF)', () => {
  it('6.000 € de ahorro al 19%', () => {
    const r = calcularModelo100(datos({ baseImponibleAhorro: 600_000 }))
    expect(r.cuotaAhorro).toBe(Math.round(6000 * 100 * 0.19))
  })

  it('7.000 € de ahorro combina 19% (6.000) y 21% (1.000)', () => {
    const r = calcularModelo100(datos({ baseImponibleAhorro: 700_000 }))
    const esperado = Math.round(6000 * 100 * 0.19) + Math.round(1000 * 100 * 0.21)
    expect(r.cuotaAhorro).toBe(esperado)
  })

  it('suma cuota general + ahorro en totalCuota', () => {
    const r = calcularModelo100(
      datos({ baseImponibleGeneral: 1_000_000, baseImponibleAhorro: 500_000 })
    )
    expect(r.totalCuota).toBe(r.cuotaIntegra + r.cuotaAhorro)
  })
})

describe('calcularModelo100 — deducción DA 61ª (Ley 5/2025)', () => {
  it('aplican 340 € cuando la base general es ≤ 15.000 €', () => {
    const r = calcularModelo100(datos({ baseImponibleGeneral: 1_000_000 }))
    // cuota integra 10.000 * 19% = 1.900 € → deducción 340 €
    expect(r.deducciones).toBe(34_000)
    expect(r.cuotaLiquida).toBe(Math.round(10000 * 100 * 0.19) - 34_000)
  })

  it('la deducción se reduce progresivamente entre 15.000 y 16.000 €', () => {
    // base 15.500 € → exceso 500 € → se resta 34*500/1 = 17.000 céntimos
    const r = calcularModelo100(datos({ baseImponibleGeneral: 1_550_000 }))
    expect(r.deducciones).toBe(34_000 - 17_000)
  })

  it('desaparece la deducción a partir de 16.000 €', () => {
    const r = calcularModelo100(datos({ baseImponibleGeneral: 1_600_000 }))
    expect(r.deducciones).toBe(0)
  })
})

describe('calcularModelo100 — a pagar / a devolver', () => {
  it('calcula aPagar cuando la cuota líquida supera los pagos anticipados', () => {
    const r = calcularModelo100(
      datos({ baseImponibleGeneral: 3_000_000, pagosFraccionados: 400_000, retenciones: 100_000 })
    )
    expect(r.aPagar).toBe(r.cuotaLiquida - 500_000)
    expect(r.aDevolver).toBe(0)
  })

  it('calcula aDevolver cuando los pagos anticipados superan la cuota', () => {
    const r = calcularModelo100(
      datos({ baseImponibleGeneral: 1_000_000, retenciones: 300_000 })
    )
    // cuota 1.900 € − deducción 340 € = 1.560 € < 3.000 € retenidos
    expect(r.aDevolver).toBe(Math.max(0, 300_000 - r.cuotaLiquida))
    expect(r.aPagar).toBe(0)
  })

  it('aplica la reducción por rendimientos del trabajo a la base general', () => {
    const r = calcularModelo100(
      datos({ baseImponibleGeneral: 3_000_000, reduccionTrabajo: 500_000 })
    )
    expect(r.baseImponibleGeneral).toBe(2_500_000)
  })
})
