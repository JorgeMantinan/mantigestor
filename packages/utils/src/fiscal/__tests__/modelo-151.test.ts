import { describe, it, expect } from 'vitest'
import {
  calcularModelo151,
  LIMITE_TIPO_REDUCIDO_BECKHAM_CENTS,
  TIPO_GENERAL_BECKHAM,
  TIPO_EXCESO_BECKHAM,
} from '../modelo-151'

describe('calcularModelo151 — régimen de trabajadores desplazados (Beckham)', () => {
  it('aplica el 24% hasta 600.000 € y el 47% sobre el exceso', () => {
    expect(TIPO_GENERAL_BECKHAM).toBe(24)
    expect(TIPO_EXCESO_BECKHAM).toBe(47)

    const res = calcularModelo151({
      rendimientosBaseGeneralCents: 70_000_000, // 700.000 €
      pagosACuentaCents: 16_000_000, // 160.000 €
    })
    expect(res.baseHastaLimiteCents).toBe(LIMITE_TIPO_REDUCIDO_BECKHAM_CENTS)
    expect(res.baseExcesoCents).toBe(10_000_000) // 100.000 €
    expect(res.cuotaHastaLimiteCents).toBe(14_400_000) // 144.000 €
    expect(res.cuotaExcesoCents).toBe(4_700_000) // 47.000 €
    expect(res.cuotaIntegraCents).toBe(19_100_000)
    expect(res.resultadoCents).toBe(3_100_000) // a ingresar
  })

  it('rendimientos por debajo del límite tributan íntegramente al 24%', () => {
    const res = calcularModelo151({ rendimientosBaseGeneralCents: 20_000_000, pagosACuentaCents: 0 })
    expect(res.baseExcesoCents).toBe(0)
    expect(res.cuotaIntegraCents).toBe(4_800_000) // 48.000 €
  })

  it('los pagos a cuenta superiores a la cuota dan resultado a devolver (negativo)', () => {
    const res = calcularModelo151({ rendimientosBaseGeneralCents: 10_000_000, pagosACuentaCents: 3_000_000 })
    expect(res.cuotaIntegraCents).toBe(2_400_000)
    expect(res.resultadoCents).toBe(-600_000)
  })
})
