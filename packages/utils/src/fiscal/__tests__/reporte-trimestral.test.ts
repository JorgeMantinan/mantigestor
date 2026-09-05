import { describe, it, expect } from 'vitest'
import { generarReporteTrimestral, reporteTrimestralCSV } from '../reporte-trimestral'

describe('generarReporteTrimestral', () => {
  it('genera reporte Q1 correctamente', () => {
    const reporte = generarReporteTrimestral({
      trimestre: 1,
      anyo: 2026,
      ingresos: 3000000, // 30000€
      gastos: 1000000, // 10000€
      ivaRepercutido: 630000, // 6300€
      ivaSoportado: 210000, // 2100€
      retencionesIRPF: 150000, // 1500€
      pagosFraccionados: 0,
    })

    expect(reporte.titulo).toContain('Q1')
    expect(reporte.titulo).toContain('2026')
    expect(reporte.periodo).toContain('Enero')
    expect(reporte.periodo).toContain('Marzo')
    expect(reporte.ingresos).toBe(3000000)
    expect(reporte.gastos).toBe(1000000)
    expect(reporte.beneficioNeto).toBe(2000000)
    expect(reporte.ivaLiquidado).toBe(420000) // 630000 - 210000
    expect(reporte.ivaAPagar).toBe(420000)
    expect(reporte.cuota130).toBe(400000) // 2000000 * 20%
  })

  it('calcula IVA a devolver cuando soportado > repercutido', () => {
    const reporte = generarReporteTrimestral({
      trimestre: 2,
      anyo: 2026,
      ingresos: 1000000,
      gastos: 2000000,
      ivaRepercutido: 210000,
      ivaSoportado: 420000,
      retencionesIRPF: 0,
      pagosFraccionados: 0,
    })

    expect(reporte.ivaLiquidado).toBe(-210000)
    expect(reporte.ivaAPagar).toBe(0) // max(0, -210000)
  })

  it('genera reporte Q4 correctamente', () => {
    const reporte = generarReporteTrimestral({
      trimestre: 4,
      anyo: 2025,
      ingresos: 5000000,
      gastos: 2000000,
      ivaRepercutido: 1050000,
      ivaSoportado: 420000,
      retencionesIRPF: 300000,
      pagosFraccionados: 100000,
    })

    expect(reporte.periodo).toContain('Octubre')
    expect(reporte.periodo).toContain('Diciembre')
    expect(reporte.retencionesIRPF).toBe(300000)
  })
})

describe('reporteTrimestralCSV', () => {
  it('genera CSV válido', () => {
    const reporte = generarReporteTrimestral({
      trimestre: 1,
      anyo: 2026,
      ingresos: 3000000,
      gastos: 1000000,
      ivaRepercutido: 630000,
      ivaSoportado: 210000,
      retencionesIRPF: 150000,
      pagosFraccionados: 0,
    })

    const csv = reporteTrimestralCSV(reporte)

    expect(csv).toContain('Reporte Trimestral Q1 2026')
    expect(csv).toContain('Ingresos')
    expect(csv).toContain('30000.00')
    expect(csv).toContain('Gastos')
    expect(csv).toContain('10000.00')
    expect(csv).toContain('Modelo 130')
    expect(csv.split('\n').length).toBeGreaterThan(10)
  })
})
