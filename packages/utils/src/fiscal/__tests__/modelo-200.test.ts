import { describe, it, expect } from 'vitest'
import { calcularModelo200, tipoImpositivo, escalaImpositiva, type DatosModelo200 } from '../modelo-200'

function datos(overrides: Partial<DatosModelo200> = {}): DatosModelo200 {
  return {
    tipoEntidad: 'SL',
    esNuevaCreacion: false,
    cif: 'B12345678',
    denominacion: 'Empresa Test',
    ejercicio: 2026,
    fechaInicio: '2026-01-01',
    fechaFin: '2026-12-31',
    ingresosExplotacion: 500_000,
    otrosIngresos: 0,
    gastosExplotacion: 300_000,
    gastosFinancieros: 10_000,
    resultadosExtranjeros: 0,
    resultadoContable: 190_000,
    ajustesFiscales: 0,
    baseImponible: 190_000,
    basesNegativasArrastradas: 0,
    basesNegativasAnoActual: 0,
    tipoImpositivo: 25,
    cuotaIntegra: 0,
    deducciones: 0,
    cuotaLiquida: 0,
    pagosFraccionados: 0,
    retenciones: 0,
    percepiones: 0,
    resultadoADevolver: 0,
    resultadoAPagar: 0,
    ...overrides,
  }
}

describe('tipoImpositivo', () => {
  it('nueva creación paga 15%', () => {
    expect(tipoImpositivo('SL', true, 500_000, 2026)).toBe(15)
  })

  it('cooperativa (resultados protegidos) paga 20%', () => {
    expect(tipoImpositivo('cooperativa', false, 2_000_000, 2026)).toBe(20)
  })

  it('micropyme 2026 (<1M€) escala 19/21%', () => {
    expect(escalaImpositiva('SL', false, 500_000, 2026)).toEqual([
      { hasta: 50_000, tipo: 19 },
      { hasta: null, tipo: 21 },
    ])
    expect(tipoImpositivo('SL', false, 500_000, 2026)).toBe(21)
  })

  it('micropyme 2025 (<1M€) escala 21/22%', () => {
    expect(escalaImpositiva('SL', false, 500_000, 2025)).toEqual([
      { hasta: 50_000, tipo: 21 },
      { hasta: null, tipo: 22 },
    ])
  })

  it('reducida dimensión (1-10M€) paga 23% en 2026', () => {
    expect(tipoImpositivo('SL', false, 5_000_000, 2026)).toBe(23)
    expect(tipoImpositivo('SL', false, 5_000_000, 2025)).toBe(24)
    expect(tipoImpositivo('SL', false, 5_000_000, 2027)).toBe(22)
  })

  it('general (INCN >10M€) paga 25%', () => {
    expect(tipoImpositivo('SL', false, 20_000_000, 2026)).toBe(25)
  })

  it('SA de nueva creación paga 15%', () => {
    expect(tipoImpositivo('SA', true, 5_000_000, 2026)).toBe(15)
  })
})

describe('calcularModelo200', () => {
  it('calcula cuota íntegra con escala de micropyme 2026 (19/21%)', () => {
    const res = calcularModelo200(datos({
      resultadoContable: 200_000,
      ajustesFiscales: 0,
      basesNegativasArrastradas: 0,
      deducciones: 0,
      pagosFraccionados: 0,
      retenciones: 0,
      percepiones: 0,
    }))

    expect(res.tipoImpositivo).toBe(21)
    expect(res.cuotaIntegra).toBe(41_000) // 50.000×19% + 150.000×21%
    expect(res.cuotaLiquida).toBe(41_000)
    expect(res.totalAPagar).toBe(41_000)
    expect(res.totalADevolver).toBe(0)
  })

  it('cuota con tipo general 25% cuando INCN >10M€', () => {
    const res = calcularModelo200(datos({
      ingresosExplotacion: 20_000_000,
      resultadoContable: 200_000,
      deducciones: 0,
      pagosFraccionados: 0,
    }))

    expect(res.tipoImpositivo).toBe(25)
    expect(res.cuotaIntegra).toBe(50_000)
  })

  it('reducida dimensión en 2025 aplica el tipo 24%', () => {
    const res = calcularModelo200(datos({
      ejercicio: 2025,
      ingresosExplotacion: 5_000_000,
      resultadoContable: 200_000,
      deducciones: 0,
      pagosFraccionados: 0,
    }))

    expect(res.tipoImpositivo).toBe(24)
    expect(res.cuotaIntegra).toBe(48_000)
  })

  it('aplica bases negativas arrastradas', () => {
    const res = calcularModelo200(datos({
      resultadoContable: 200_000,
      ajustesFiscales: 0,
      basesNegativasArrastradas: 150_000,
      deducciones: 0,
      pagosFraccionados: 0,
    }))

    expect(res.cuotaIntegra).toBe(9_500) // 50.000 al 19%
    expect(res.totalAPagar).toBe(9_500)
  })

  it('base imponible no puede ser negativa', () => {
    const res = calcularModelo200(datos({
      resultadoContable: 50_000,
      ajustesFiscales: 0,
      basesNegativasArrastradas: 100_000,
      deducciones: 0,
    }))

    expect(res.cuotaIntegra).toBe(0)
    expect(res.totalAPagar).toBe(0)
  })

  it('deducciones reducen cuota líquida', () => {
    const res = calcularModelo200(datos({
      resultadoContable: 200_000,
      ajustesFiscales: 0,
      basesNegativasArrastradas: 0,
      deducciones: 10_000,
      pagosFraccionados: 0,
    }))

    expect(res.cuotaLiquida).toBe(31_000) // 41.000 − 10.000
  })

  it('pagos fraccionados reducen resultado a pagar', () => {
    const res = calcularModelo200(datos({
      resultadoContable: 200_000,
      deducciones: 0,
      pagosFraccionados: 30_000,
      retenciones: 5_000,
      percepiones: 0,
    }))

    expect(res.totalAPagar).toBe(6_000) // 41.000 − 35.000
  })

  it('devuelve dinero si pagos fraccionados > cuota líquida', () => {
    const res = calcularModelo200(datos({
      resultadoContable: 100_000,
      basesNegativasArrastradas: 0,
      deducciones: 0,
      pagosFraccionados: 40_000,
      retenciones: 5_000,
      percepiones: 0,
    }))

    expect(res.cuotaIntegra).toBe(20_000) // 50.000×19% + 50.000×21%
    expect(res.totalADevolver).toBe(25_000) // 45.000 − 20.000
    expect(res.totalAPagar).toBe(0)
  })

  it('tipo 15% y cuota reducida para nueva creación', () => {
    const res = calcularModelo200(datos({
      resultadoContable: 200_000,
      deducciones: 0,
      pagosFraccionados: 0,
      esNuevaCreacion: true,
    }))

    expect(res.tipoImpositivo).toBe(15)
    expect(res.cuotaIntegra).toBe(30_000) // 200.000 × 15%
    expect(res.observaciones.some(o => o.includes('nueva creación'))).toBe(true)
  })

  it('sin ingresos y sin deducciones', () => {
    const res = calcularModelo200(datos({
      resultadoContable: 0,
      ajustesFiscales: 0,
      basesNegativasArrastradas: 0,
      deducciones: 0,
      pagosFraccionados: 0,
    }))

    expect(res.cuotaIntegra).toBe(0)
    expect(res.totalAPagar).toBe(0)
    expect(res.totalADevolver).toBe(0)
  })
})
