import { describe, it, expect } from 'vitest'
import { calcularCuotaEscala, calcularIrpf, type EscalaIrpf } from '../irpf'

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

const AUTONOMICA_EJEMPLO: EscalaIrpf = {
  ambito: 'AUTONOMICO',
  comunidad: 'Comunidad de Madrid',
  taxYear: 2025,
  tramos: [
    { tramo: 1, desdeEur: 0, hastaEur: 12450, tipoPct: 9 },
    { tramo: 2, desdeEur: 12450, hastaEur: 20200, tipoPct: 11.5 },
    { tramo: 3, desdeEur: 20200, hastaEur: 35200, tipoPct: 14.5 },
    { tramo: 4, desdeEur: 35200, hastaEur: 60000, tipoPct: 18 },
    { tramo: 5, desdeEur: 60000, hastaEur: null, tipoPct: 22 },
  ],
}

describe('calcularCuotaEscala', () => {
  it('calcula la cuota progresiva dentro del segundo tramo (20.000 € estatal)', () => {
    const r = calcularCuotaEscala(2_000_000, ESTATAL_2025)
    const esperado = Math.round(12450 * 100 * 0.095) + Math.round(7550 * 100 * 0.12)
    expect(r.cuotaTotalCentimos).toBe(esperado)
    expect(r.detalle).toHaveLength(2)
    expect(r.detalle[1]?.baseTramoCentimos).toBe(755_000)
  })

  it('base cero produce cuota cero y tipo medio cero', () => {
    const r = calcularCuotaEscala(0, ESTATAL_2025)
    expect(r.cuotaTotalCentimos).toBe(0)
    expect(r.tipoMedioPct).toBe(0)
    expect(r.detalle).toHaveLength(0)
  })

  it('base en el primer tramo solo usa ese tramo', () => {
    const r = calcularCuotaEscala(1_000_000, ESTATAL_2025)
    expect(r.cuotaTotalCentimos).toBe(Math.round(10000 * 100 * 0.095))
    expect(r.detalle).toHaveLength(1)
  })

  it('base superior al último tramo usa el límite superior abierto', () => {
    const r = calcularCuotaEscala(10_000_000, ESTATAL_2025)
    const cuotaTramosCerrados =
      Math.round(12450 * 100 * 0.095) +
      Math.round(7750 * 100 * 0.12) +
      Math.round(15000 * 100 * 0.15) +
      Math.round(24800 * 100 * 0.185)
    const cuotaUltimo = Math.round((100000 - 60000) * 100 * 0.225)
    expect(r.cuotaTotalCentimos).toBe(cuotaTramosCerrados + cuotaUltimo)
    expect(r.detalle).toHaveLength(5)
    expect(r.detalle[4]?.hastaCentimos).toBeNull()
  })

  it('calcula el tipo medio sobre la base', () => {
    const r = calcularCuotaEscala(2_000_000, ESTATAL_2025)
    expect(r.tipoMedioPct).toBe(Number(((r.cuotaTotalCentimos / 2_000_000) * 100).toFixed(2)))
  })

  it('lanza error si la base tiene decimales', () => {
    expect(() => calcularCuotaEscala(1000.5, ESTATAL_2025)).toThrow('entero')
  })

  it('lanza error con base negativa', () => {
    expect(() => calcularCuotaEscala(-1, ESTATAL_2025)).toThrow('negativa')
  })

  it('lanza error si los tramos no son contiguos', () => {
    const rota: EscalaIrpf = {
      ...ESTATAL_2025,
      tramos: [
        { tramo: 1, desdeEur: 0, hastaEur: 10000, tipoPct: 9.5 },
        { tramo: 2, desdeEur: 12000, hastaEur: 20000, tipoPct: 12 },
      ],
    }
    expect(() => calcularCuotaEscala(500_000, rota)).toThrow('contiguos')
  })
})

describe('calcularIrpf', () => {
  it('suma cuotas estatal y autonómica', () => {
    const r = calcularIrpf(2_000_000, ESTATAL_2025, AUTONOMICA_EJEMPLO)
    expect(r.estatal.cuotaTotalCentimos).toBe(calcularCuotaEscala(2_000_000, ESTATAL_2025).cuotaTotalCentimos)
    expect(r.autonomica.cuotaTotalCentimos).toBe(calcularCuotaEscala(2_000_000, AUTONOMICA_EJEMPLO).cuotaTotalCentimos)
    expect(r.cuotaIntegraCentimos).toBe(r.estatal.cuotaTotalCentimos + r.autonomica.cuotaTotalCentimos)
    expect(r.avisos).toHaveLength(0)
  })

  it('avisa cuando los años fiscales no coinciden', () => {
    const otra2024 = { ...AUTONOMICA_EJEMPLO, taxYear: 2024 }
    const r = calcularIrpf(1_000_000, ESTATAL_2025, otra2024)
    expect(r.avisos).toHaveLength(1)
    expect(r.avisos[0]).toContain('distintos')
  })
})
