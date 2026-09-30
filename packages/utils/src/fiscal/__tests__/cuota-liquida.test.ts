import { describe, it, expect } from 'vitest'
import {
  calcularCuotaLiquida,
  escalaAhorroComun,
  type EntradasCuotaLiquida,
} from '../cuota-liquida'
import { calcularCuotaEscala, type EscalaIrpf } from '../irpf'

const ESTATAL_2025: EscalaIrpf = {
  ambito: 'ESTATAL',
  comunidad: null,
  taxYear: 2025,
  tramos: [
    { tramo: 1, desdeEur: 0, hastaEur: 12450, tipoPct: 9.5 },
    { tramo: 2, desdeEur: 12450, hastaEur: 20200, tipoPct: 12 },
    { tramo: 3, desdeEur: 20200, hastaEur: 35200, tipoPct: 15 },
    { tramo: 4, desdeEur: 35200, hastaEur: 60000, tipoPct: 18.5 },
    { tramo: 5, desdeEur: 60000, hastaEur: null, tipoPct: 22.5 },
  ],
}

const AUTONOMICA_2025: EscalaIrpf = { ...ESTATAL_2025, ambito: 'AUTONOMICO', comunidad: 'Madrid' }

function entradaBase(extra: Partial<EntradasCuotaLiquida> = {}): EntradasCuotaLiquida {
  return {
    baseGeneralCents: 0,
    minimoPersonalYFamiliarCents: 0,
    escalasGenerales: [ESTATAL_2025, AUTONOMICA_2025],
    ...extra,
  }
}

describe('escalaAhorroComun', () => {
  it('devuelve dos escalas espejo con los tipos del art. 63 LIRPF (mitades)', () => {
    const escalas = escalaAhorroComun(2025)
    expect(escalas).toHaveLength(2)
    expect(escalas[0]?.tramos.map(t => t.tipoPct)).toEqual([9.5, 10.5, 11.5, 13.5, 15])
    expect(escalas[1]?.tramos).toEqual(escalas[0]?.tramos)
  })
})

describe('calcularCuotaLiquida — mínimo personal y familiar (art. 63 LIRPF)', () => {
  it('el mínimo minora la cuota con la escala, no la base (esquema gráfico AEAT)', () => {
    const r = calcularCuotaLiquida(entradaBase({ baseGeneralCents: 3_000_000, minimoPersonalYFamiliarCents: 555_000 }))
    const completa = calcularCuotaEscala(3_000_000, ESTATAL_2025).cuotaTotalCentimos * 2
    const sobreMinimo = calcularCuotaEscala(555_000, ESTATAL_2025).cuotaTotalCentimos * 2
    expect(r.cuotaIntegraGeneralCents).toBe(completa - sobreMinimo)
    expect(r.cuotaIntegraGeneralCents).toBe(611_100) // 7.165,50 − 1.054,50 €
    // no es una minoración de base: escala(30.000 − 5.550) daría 524.550 céntimos
    expect(r.cuotaIntegraGeneralCents).not.toBe(calcularCuotaEscala(2_445_000, ESTATAL_2025).cuotaTotalCentimos * 2)
    expect(r.remanenteMinimoCents).toBe(0)
    expect(r.minoracionMinimoGeneralCents).toBe(sobreMinimo)
  })

  it('el mínimo absorbe la base general y deja cuota cero', () => {
    const r = calcularCuotaLiquida(entradaBase({ baseGeneralCents: 2_000_000, minimoPersonalYFamiliarCents: 2_500_000 }))
    expect(r.cuotaIntegraGeneralCents).toBe(0)
    expect(r.remanenteMinimoCents).toBe(500_000)
    expect(r.cuotaIntegraTotalCents).toBe(0)
    expect(r.cuotaLiquidaCents).toBe(0)
  })

  it('el remanente del mínimo minora la cuota del ahorro (art. 63 LIRPF)', () => {
    // mínimo 8.000 € > general 0 → remanente 8.000; ahorro 10.000 → se minorá con escala_ahorro(8.000)
    const r = calcularCuotaLiquida(entradaBase({ baseAhorroCents: 1_000_000, minimoPersonalYFamiliarCents: 800_000 }))
    expect(r.remanenteMinimoCents).toBe(800_000)
    const mitad = escalaAhorroComun(2025)[0]
    const cuotaCompleta = mitad ? calcularCuotaEscala(1_000_000, mitad).cuotaTotalCentimos * 2 : 0
    const minoracion = mitad ? calcularCuotaEscala(800_000, mitad).cuotaTotalCentimos * 2 : 0
    expect(r.minoracionMinimoAhorroCents).toBe(minoracion)
    expect(r.cuotaIntegraAhorroCents).toBe(cuotaCompleta - minoracion)
    expect(r.avisos.some(a => a.includes('minora también la cuota del ahorro'))).toBe(true)
  })
})

describe('calcularCuotaLiquida — cuotas', () => {
  it('caso completo conocido: general 40.000 € con escalas de referencia estatal duplicadas', () => {
    const r = calcularCuotaLiquida(entradaBase({ baseGeneralCents: 4_000_000 }))
    const cuotaUnaMitad = calcularCuotaEscala(4_000_000, ESTATAL_2025).cuotaTotalCentimos
    expect(r.cuotaIntegraGeneralCents).toBe(cuotaUnaMitad * 2)
    expect(r.cuotaIntegraTotalCents).toBe(cuotaUnaMitad * 2)
    expect(r.detalleGeneral).toHaveLength(2)
  })

  it('grava la parte del ahorro con la escala espejo del art. 63 cuando es territorio común', () => {
    const r = calcularCuotaLiquida(entradaBase({ baseGeneralCents: 0, baseAhorroCents: 600_000 }))
    // 6.000 € al 19% total (dos mitades del 9,5%)
    expect(r.cuotaIntegraAhorroCents).toBe(Math.round(6000 * 100 * 0.19))
    expect(r.avisos.some(a => a.includes('art. 63'))).toBe(true)
  })
})

describe('calcularCuotaLiquida — deducciones y pagos a cuenta', () => {
  it('las deducciones se limitan a la cuota íntegra', () => {
    const r = calcularCuotaLiquida(entradaBase({ baseGeneralCents: 4_000_000, deduccionesCents: 99_999_999 }))
    expect(r.deduccionesAplicadasCents).toBe(r.cuotaIntegraTotalCents)
    expect(r.cuotaLiquidaCents).toBe(0)
    expect(r.avisos.some(a => a.includes('exceden'))).toBe(true)
  })

  it('los pagos a cuenta superiores a la cuota líquida producen diferencia negativa (devolución)', () => {
    const r = calcularCuotaLiquida(entradaBase({ baseGeneralCents: 4_000_000, pagosACuentaCents: 9_999_999 }))
    expect(r.cuotaDiferenciaCents).toBeLessThan(0)
    expect(r.cuotaDiferenciaCents).toBe(r.cuotaLiquidaCents - 9_999_999)
  })
})

describe('calcularCuotaLiquida — forales', () => {
  it('acepta una única escala íntegra si hay base de ahorro cero', () => {
    const foral = calcularCuotaLiquida({
      baseGeneralCents: 2_000_000,
      minimoPersonalYFamiliarCents: 555_000,
      escalasGenerales: [{ ...ESTATAL_2025, comunidad: 'País Vasco - Bizkaia' }],
    })
    expect(foral.detalleGeneral).toHaveLength(1)
    expect(foral.cuotaIntegraGeneralCents).toBe(
      calcularCuotaEscala(2_000_000, ESTATAL_2025).cuotaTotalCentimos -
        calcularCuotaEscala(555_000, ESTATAL_2025).cuotaTotalCentimos,
    )
  })

  it('exige escala del ahorro propia para base de ahorro en territorio foral', () => {
    expect(() =>
      calcularCuotaLiquida({
        baseGeneralCents: 0,
        baseAhorroCents: 100_000,
        minimoPersonalYFamiliarCents: 0,
        escalasGenerales: [ESTATAL_2025],
      }),
    ).toThrow('escala del ahorro')
  })
})

describe('calcularCuotaLiquida — validaciones', () => {
  it('rechaza bases con decimales o negativas', () => {
    expect(() => calcularCuotaLiquida(entradaBase({ baseGeneralCents: 1.5 }))).toThrow('entero')
    expect(() => calcularCuotaLiquida(entradaBase({ baseGeneralCents: -1 }))).toThrow('negativa')
    expect(() => calcularCuotaLiquida(entradaBase({ minimoPersonalYFamiliarCents: -5 }))).toThrow('negativa')
  })

  it('avisa con escalas de años distintos', () => {
    const r = calcularCuotaLiquida(
      entradaBase({ escalasGenerales: [ESTATAL_2025, { ...AUTONOMICA_2025, taxYear: 2026 }] }),
    )
    expect(r.avisos.some(a => a.includes('distintos'))).toBe(true)
  })

  it('rechaza más de dos escalas generales', () => {
    expect(() =>
      calcularCuotaLiquida(
        entradaBase({ escalasGenerales: [ESTATAL_2025, AUTONOMICA_2025, { ...ESTATAL_2025 }] }),
      ),
    ).toThrow('Como máximo dos')
  })
})
