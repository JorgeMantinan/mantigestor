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
  it('2026: 12.450 € al 19% (estatal+autonómico combinado)', () => {
    const r = calcularModelo100(datos({ baseImponibleGeneral: 1_245_000 }))
    expect(r.cuotaIntegra).toBe(Math.round(12450 * 100 * 0.19))
  })

  it('2026: base 30.000 € aplica los tramos 19/24/30 correctamente', () => {
    const r = calcularModelo100(datos({ baseImponibleGeneral: 3_000_000 }))
    const esperado =
      Math.round(12450 * 100 * 0.19) +
      Math.round(7750 * 100 * 0.24) +
      Math.round((30000 - 20200) * 100 * 0.30)
    expect(r.cuotaIntegra).toBe(esperado)
    expect(r.cuotaIntegra).toBe(716_550) // 2.365,50 + 1.860 + 2.940 €
  })

  it('2026: base 31.000 € mantiene el tramo del 30% hasta 35.200€', () => {
    const r = calcularModelo100(datos({ baseImponibleGeneral: 3_100_000 }))
    // 0-12450 @19, 12450-20200 @24, 20200-31000 @30
    const esperado =
      Math.round(12450 * 100 * 0.19) +
      Math.round(7750 * 100 * 0.24) +
      Math.round((31000 - 20200) * 100 * 0.30)
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

describe('calcularModelo100 — deducción DA 61ª (Ley 5/2025 / RDL 5/2026)', () => {
  it('2026: aplica 590,89 € cuando los rendimientos íntegros son ≤ 17.094 €', () => {
    const r = calcularModelo100(datos({ baseImponibleGeneral: 1_000_000 }))
    // cuota íntegra 10.000 * 19% = 1.900 € → deducción 590,89 €
    expect(r.deducciones).toBe(59_089)
    expect(r.cuotaLiquida).toBe(Math.round(10000 * 100 * 0.19) - 59_089)
  })

  it('2026: la deducción se reduce progresivamente entre 17.094 y 20.048,45 €', () => {
    // base 18.000 € → exceso 906 € → 590,89 − 0,2 × 906 = 409,69 €
    const r = calcularModelo100(datos({ baseImponibleGeneral: 1_800_000 }))
    expect(r.deducciones).toBe(59_089 - 18_120)
  })

  it('2026: desaparece la deducción a partir de 20.048,45 €', () => {
    const r = calcularModelo100(datos({ baseImponibleGeneral: 2_100_000 }))
    expect(r.deducciones).toBe(0)
  })

  it('2025: aplica 340 € con los umbrales del ejercicio 2025', () => {
    const r = calcularModelo100(datos({ baseImponibleGeneral: 1_000_000, ejercicio: 2025 }))
    expect(r.deducciones).toBe(34_000)
  })

  it('2024: no existe la deducción DA 61ª', () => {
    const r = calcularModelo100(datos({ baseImponibleGeneral: 1_000_000, ejercicio: 2024 }))
    expect(r.deducciones).toBe(0)
  })
})

describe('calcularModelo100 — mínimo personal y familiar (art. 62 LIRPF)', () => {
  it('minor la cuota íntegra con la escala aplicada al mínimo', () => {
    const r = calcularModelo100(datos({ baseImponibleGeneral: 3_000_000, minimoPersonalFamiliar: 555_000 }))
    // escala(30.000) − escala(5.550) = 716.550 − 105.450 céntimos
    expect(r.cuotaIntegra).toBe(716_550 - Math.round(5550 * 100 * 0.19))
  })

  it('el remanente del mínimo minor la cuota del ahorro', () => {
    const r = calcularModelo100(
      datos({ baseImponibleGeneral: 200_000, baseImponibleAhorro: 600_000, minimoPersonalFamiliar: 555_000 })
    )
    // general: escala(2.000) − escala(5.550) → 0 (no puede ser negativa)
    // remanente 3.550 € → minoración sobre ahorro: 114.000 − 67.450 céntimos
    expect(r.cuotaIntegra).toBe(0)
    expect(r.cuotaAhorro).toBe(114_000 - 67_450)
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
