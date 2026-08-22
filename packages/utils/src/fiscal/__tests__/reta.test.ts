import { describe, it, expect } from 'vitest'
import { seleccionarTramoReta, estimarCuotaReta, type TramoReta } from '../reta'

const TRAMOS: TramoReta[] = [
  { tabla: 'RETA_2026', tramo: 1, rendimientoNetoDesdeEur: 0, rendimientoNetoHastaEur: 670, baseMinimaEur: 819.1, baseMaximaEur: 1148.9, cuotaMinimaRefEur: 258.02 },
  { tabla: 'RETA_2026', tramo: 2, rendimientoNetoDesdeEur: 670.01, rendimientoNetoHastaEur: 900, baseMinimaEur: 913.5, baseMaximaEur: 1253.3, cuotaMinimaRefEur: 287.75 },
  { tabla: 'RETA_2026', tramo: 3, rendimientoNetoDesdeEur: 900, rendimientoNetoHastaEur: null, baseMinimaEur: 1264.4, baseMaximaEur: 4762.65, cuotaMinimaRefEur: 398.29 },
]

describe('seleccionarTramoReta', () => {
  it('selecciona el tramo correcto según el rendimiento neto mensual', () => {
    expect(seleccionarTramoReta(500_00, TRAMOS).tramo).toBe(1)
    expect(seleccionarTramoReta(800_00, TRAMOS).tramo).toBe(2)
    expect(seleccionarTramoReta(3000_00, TRAMOS).tramo).toBe(3)
  })

  it('rendimientos por encima del último tramo caen en el tramo abierto', () => {
    expect(seleccionarTramoReta(99_999_99, TRAMOS).tramo).toBe(3)
  })

  it('lanza error con rendimiento negativo o decimal', () => {
    expect(() => seleccionarTramoReta(-100, TRAMOS)).toThrow('negativo')
    expect(() => seleccionarTramoReta(10.5, TRAMOS)).toThrow('entero')
  })
})

describe('estimarCuotaReta', () => {
  it('estima cuota mínima y máxima con el 31,5% por defecto', () => {
    const r = estimarCuotaReta(TRAMOS[0]!)
    expect(r.baseMinimaCentimos).toBe(81_910)
    expect(r.baseMaximaCentimos).toBe(114_890)
    expect(r.cuotaEstimadaMinCentimos).toBe(Math.round(819.1 * 100 * 0.315))
    expect(r.cuotaEstimadaMaxCentimos).toBe(Math.round(1148.9 * 100 * 0.315))
  })

  it('acepta un porcentaje de cotización distinto', () => {
    const r = estimarCuotaReta(TRAMOS[0]!, 30)
    expect(r.cuotaEstimadaMinCentimos).toBe(Math.round(819.1 * 100 * 0.3))
  })

  it('lanza error con porcentaje inválido', () => {
    expect(() => estimarCuotaReta(TRAMOS[0]!, 0)).toThrow('inválido')
    expect(() => estimarCuotaReta(TRAMOS[0]!, 150)).toThrow('inválido')
  })
})
