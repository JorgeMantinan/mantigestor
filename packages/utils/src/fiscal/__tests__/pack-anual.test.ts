import { describe, it, expect } from 'vitest'
import { calcularPackAnual, packAnualCsv } from '../pack-anual'

const facturasEjemplo = [
  // Q1
  { tipo: 'ingreso' as const, baseImponible: 100000, iva: 21, total: 121000, fechaEmision: '2026-01-15' },
  { tipo: 'ingreso' as const, baseImponible: 200000, iva: 21, total: 242000, fechaEmision: '2026-02-10' },
  { tipo: 'gasto' as const, baseImponible: 50000, iva: 21, total: 60500, fechaEmision: '2026-03-05' },
  // Q2
  { tipo: 'ingreso' as const, baseImponible: 150000, iva: 10, total: 165000, fechaEmision: '2026-04-20' },
  { tipo: 'gasto' as const, baseImponible: 30000, iva: 21, total: 36300, fechaEmision: '2026-05-15' },
  // Q3
  { tipo: 'ingreso' as const, baseImponible: 180000, iva: 21, total: 217800, fechaEmision: '2026-07-10' },
  // Q4
  { tipo: 'gasto' as const, baseImponible: 40000, iva: 10, total: 44000, fechaEmision: '2026-11-20' },
]

describe('calcularPackAnual', () => {
  it('calcula resumen de facturas correctamente', () => {
    const r = calcularPackAnual({
      anyo: 2026,
      nombre: 'Test Client',
      nif: '12345678Z',
      comunidadFiscal: 'Madrid',
      perfilFiscal: 'autonomo',
      facturas: facturasEjemplo,
    })

    expect(r.resumenFacturas.totalEmitidas).toBe(4)
    expect(r.resumenFacturas.totalRecibidas).toBe(3)
    expect(r.resumenFacturas.ingresos).toBe(121000 + 242000 + 165000 + 217800)
    expect(r.resumenFacturas.gastos).toBe(60500 + 36300 + 44000)
  })

  it('calcula IVA por trimestre', () => {
    const r = calcularPackAnual({
      anyo: 2026,
      nombre: 'Test',
      nif: null,
      comunidadFiscal: null,
      perfilFiscal: null,
      facturas: facturasEjemplo,
    })

    expect(r.iva.porTrimestre).toHaveLength(4)

    // Q1: ingresos 321000, gastos 50000
    const q1 = r.iva.porTrimestre[0]!
    expect(q1.ivaRepercutido).toBe(Math.round(300000 * 0.21))
    expect(q1.ivaSoportado).toBe(Math.round(50000 * 0.21))

    // Q2: ingresos 150000, gastos 30000
    const q2 = r.iva.porTrimestre[1]!
    expect(q2.ivaRepercutido).toBe(Math.round(150000 * 0.10))
    expect(q2.ivaSoportado).toBe(Math.round(30000 * 0.21))

    // Q3: solo ingreso
    const q3 = r.iva.porTrimestre[2]!
    expect(q3.ivaRepercutido).toBe(Math.round(180000 * 0.21))
    expect(q3.ivaSoportado).toBe(0)

    // Q4: solo gasto
    const q4 = r.iva.porTrimestre[3]!
    expect(q4.ivaRepercutido).toBe(0)
    expect(q4.ivaSoportado).toBe(Math.round(40000 * 0.10))
  })

  it('calcula IVA neto anual', () => {
    const r = calcularPackAnual({
      anyo: 2026,
      nombre: 'Test',
      nif: null,
      comunidadFiscal: null,
      perfilFiscal: null,
      facturas: facturasEjemplo,
    })

    const totalR = r.iva.porTrimestre.reduce((s, t) => s + t.ivaRepercutido, 0)
    const totalS = r.iva.porTrimestre.reduce((s, t) => s + t.ivaSoportado, 0)
    expect(r.iva.totalRepercutido).toBe(totalR)
    expect(r.iva.totalSoportado).toBe(totalS)
    expect(r.iva.netoAnual).toBe(totalR - totalS)
  })

  it('calcula IRPF pagos fraccionados', () => {
    const r = calcularPackAnual({
      anyo: 2026,
      nombre: 'Test',
      nif: null,
      comunidadFiscal: null,
      perfilFiscal: 'autonomo',
      facturas: facturasEjemplo,
    })

    const beneficio = r.resumenFacturas.ingresos - r.resumenFacturas.gastos
    expect(r.irpf.beneficioNeto).toBe(beneficio)
    expect(r.irpf.pagoFraccionadoEstimado).toBe(Math.round(beneficio * 0.20))
  })

  it('genera checklist de modelos para autónomo', () => {
    const r = calcularPackAnual({
      anyo: 2026,
      nombre: 'Test',
      nif: null,
      comunidadFiscal: null,
      perfilFiscal: 'autonomo',
      facturas: [],
    })

    const modelos = r.modelos.map(m => m.modelo)
    expect(modelos).toContain('303')
    expect(modelos).toContain('390')
    expect(modelos).toContain('130')
    expect(modelos).toContain('100')
  })

  it('genera checklist de modelos para sociedad', () => {
    const r = calcularPackAnual({
      anyo: 2026,
      nombre: 'Test',
      nif: null,
      comunidadFiscal: null,
      perfilFiscal: 'sociedad',
      facturas: [],
    })

    const modelos = r.modelos.map(m => m.modelo)
    expect(modelos).toContain('200')
    expect(modelos).toContain('202')
    expect(modelos).toContain('303')
    expect(modelos).not.toContain('130')
  })

  it('marca 347 como obligatorio si ingresos > 300.506€', () => {
    const r = calcularPackAnual({
      anyo: 2026,
      nombre: 'Test',
      nif: null,
      comunidadFiscal: null,
      perfilFiscal: null,
      facturas: [{ tipo: 'ingreso', baseImponible: 40000000, iva: 21, total: 48400000, fechaEmision: '2026-01-15' }],
    })

    const modelo347 = r.modelos.find(m => m.modelo === '347')
    expect(modelo347?.obligatorio).toBe(true)
  })

  it('genera CSV válido', () => {
    const r = calcularPackAnual({
      anyo: 2026,
      nombre: 'Test Client',
      nif: '12345678Z',
      comunidadFiscal: 'Madrid',
      perfilFiscal: 'autonomo',
      facturas: facturasEjemplo,
    })

    const csv = packAnualCsv(r)
    expect(csv).toContain('Pack Anual Fiscal;2026')
    expect(csv).toContain('Test Client')
    expect(csv).toContain('RESUMEN DE FACTURAS')
    expect(csv).toContain('IVA ANUAL')
    expect(csv).toContain('T1;')
    expect(csv).toContain('T2;')
    expect(csv).toContain('T3;')
    expect(csv).toContain('T4;')
  })

  it('maneja facturas vacías', () => {
    const r = calcularPackAnual({
      anyo: 2026,
      nombre: 'Test',
      nif: null,
      comunidadFiscal: null,
      perfilFiscal: null,
      facturas: [],
    })

    expect(r.resumenFacturas.ingresos).toBe(0)
    expect(r.resumenFacturas.gastos).toBe(0)
    expect(r.iva.netoAnual).toBe(0)
    expect(r.irpf.pagoFraccionadoEstimado).toBe(0)
  })

  it('filtra facturas de otros años', () => {
    const r = calcularPackAnual({
      anyo: 2026,
      nombre: 'Test',
      nif: null,
      comunidadFiscal: null,
      perfilFiscal: null,
      facturas: [
        { tipo: 'ingreso', baseImponible: 100000, iva: 21, total: 121000, fechaEmision: '2025-06-15' },
        { tipo: 'ingreso', baseImponible: 200000, iva: 21, total: 242000, fechaEmision: '2026-03-10' },
      ],
    })

    expect(r.resumenFacturas.totalEmitidas).toBe(1)
    expect(r.resumenFacturas.ingresos).toBe(242000)
  })
})
