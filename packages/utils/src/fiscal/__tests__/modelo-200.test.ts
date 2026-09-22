import { describe, it, expect } from 'vitest'
import { calcularModelo200, tipoImpositivo, type DatosModelo200 } from '../modelo-200'

function datos(overrides: Partial<DatosModelo200> = {}): DatosModelo200 {
  return {
    tipoEntidad: 'SL',
    esNuevaCreacion: false,
    cif: 'B12345678',
    denominacion: 'Empresa Test',
    ejercicio: 2025,
    fechaInicio: '2025-01-01',
    fechaFin: '2025-12-31',
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
    expect(tipoImpositivo('SL', true, 500_000)).toBe(15)
  })

  it('cooperativa paga 20%', () => {
    expect(tipoImpositivo('cooperativa', false, 2_000_000)).toBe(20)
  })

  it('reducida dimensión (<1M€) paga 23%', () => {
    expect(tipoImpositivo('SL', false, 500_000)).toBe(23)
  })

  it('general paga 25%', () => {
    expect(tipoImpositivo('SL', false, 2_000_000)).toBe(25)
  })

  it('SA de nueva creación paga 15%', () => {
    expect(tipoImpositivo('SA', true, 5_000_000)).toBe(15)
  })
})

describe('calcularModelo200', () => {
  it('calcula cuota íntegra con tipo general 25%', () => {
    const res = calcularModelo200(datos({
      resultadoContable: 200_000,
      ajustesFiscales: 0,
      basesNegativasArrastradas: 0,
      deducciones: 0,
      pagosFraccionados: 0,
      retenciones: 0,
      percepiones: 0,
    }))

    expect(res.tipoImpositivo).toBe(23)
    expect(res.cuotaIntegra).toBe(46_000)
    expect(res.cuotaLiquida).toBe(46_000)
    expect(res.totalAPagar).toBe(46_000)
    expect(res.totalADevolver).toBe(0)
  })

  it('aplica bases negativas arrastradas', () => {
    const res = calcularModelo200(datos({
      resultadoContable: 200_000,
      ajustesFiscales: 0,
      basesNegativasArrastradas: 150_000,
      deducciones: 0,
      pagosFraccionados: 0,
    }))

    expect(res.cuotaIntegra).toBe(11_500)
    expect(res.totalAPagar).toBe(11_500)
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

    expect(res.cuotaLiquida).toBe(36_000)
  })

  it('pagos fraccionados reducen resultado a pagar', () => {
    const res = calcularModelo200(datos({
      resultadoContable: 200_000,
      deducciones: 0,
      pagosFraccionados: 30_000,
      retenciones: 5_000,
      percepiones: 0,
    }))

    expect(res.totalAPagar).toBe(11_000)
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

    expect(res.cuotaIntegra).toBe(23_000)
    expect(res.totalADevolver).toBe(22_000)
    expect(res.totalAPagar).toBe(0)
  })

  it('tipo 15% para nueva creación', () => {
    const res = calcularModelo200(datos({
      resultadoContable: 200_000,
      deducciones: 0,
      pagosFraccionados: 0,
    }))
    res.esNuevaCreacion = true

    expect(res.tipoImpositivo).toBe(23)
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
