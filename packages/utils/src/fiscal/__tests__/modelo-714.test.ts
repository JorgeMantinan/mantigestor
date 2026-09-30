import { describe, it, expect } from 'vitest'
import { calcularModelo714, type BienPatrimonio, COMUNIDADES_AUTONOMAS } from '../modelo-714'

function bien(overrides: Partial<BienPatrimonio>): BienPatrimonio {
  return {
    tipo: 'inmueble',
    descripcion: 'Vivienda',
    valor: 0,
    deudas: 0,
    ...overrides,
  }
}

describe('calcularModelo714 — Impuesto sobre el Patrimonio', () => {
  it('calcula base imponible restando las deudas del valor total', () => {
    const r = calcularModelo714({
      bienes: [
        bien({ valor: 60_000_000 }), // 600.000 €
        bien({ valor: 30_000_000, deudas: 10_000_000 }), // 300.000 €
      ],
      comunidadAutonoma: 'Madrid',
    })
    expect(r.valorTotal).toBe(90_000_000)
    expect(r.deudas).toBe(10_000_000)
    expect(r.baseImponible).toBe(80_000_000) // 800.000 €
  })

  it('declara obligatorio cuando la base supera los 700.000 €', () => {
    const r = calcularModelo714({
      bienes: [bien({ valor: 90_000_000 })], // 900.000 €
      comunidadAutonoma: 'Madrid',
    })
    expect(r.obligatorio).toBe(true)
  })

  it('no es obligatorio cuando la base no supera el umbral de 700.000 €', () => {
    const r = calcularModelo714({
      bienes: [bien({ valor: 60_000_000 })], // 600.000 €
      comunidadAutonoma: 'Madrid',
    })
    expect(r.obligatorio).toBe(false)
  })

  it('aplica la bonificación autonómica del 100% (Madrid, desde 2009)', () => {
    const r = calcularModelo714({
      bienes: [bien({ valor: 90_000_000 })],
      comunidadAutonoma: 'Madrid',
    })
    expect(r.porcentajeBonificacion).toBe(1)
    expect(r.bonificacionAplicable).toContain('100%')
  })

  it('Cataluña no tiene bonificación general en cuota', () => {
    const r = calcularModelo714({
      bienes: [bien({ valor: 90_000_000 })],
      comunidadAutonoma: 'Cataluña',
    })
    expect(r.porcentajeBonificacion).toBe(0)
  })

  it('indica ausencia de bonificación para una comunidad sin dato', () => {
    const r = calcularModelo714({
      bienes: [bien({ valor: 90_000_000 })],
      comunidadAutonoma: 'Comunidad Desconocida',
    })
    expect(r.porcentajeBonificacion).toBe(0)
    expect(r.bonificacionAplicable).toContain('Sin bonificación')
  })

  it('nunca genera base imponible negativa cuando las deudas superan el valor', () => {
    const r = calcularModelo714({
      bienes: [bien({ valor: 10_000_000, deudas: 50_000_000 })],
      comunidadAutonoma: 'Madrid',
    })
    expect(r.baseImponible).toBe(0)
    expect(r.obligatorio).toBe(false)
  })

  it('expone el catálogo de comunidades autónomas ordenado', () => {
    expect(COMUNIDADES_AUTONOMAS).toContain('Cataluña')
    expect(COMUNIDADES_AUTONOMAS).toContain('Comunidad Valenciana')
    expect([...COMUNIDADES_AUTONOMAS]).toEqual([...COMUNIDADES_AUTONOMAS].sort())
  })
})

describe('calcularModelo714 — deducciones y bonificaciones (estatales + autonómicas)', () => {
  it('incluye siempre las dos estatales: impuestos en el extranjero (art. 32) y Ceuta/Melilla (art. 33)', () => {
    const r = calcularModelo714({
      bienes: [bien({ valor: 90_000_000 })],
      comunidadAutonoma: 'Castilla-La Mancha',
    })
    const estatales = r.deducciones.filter(d => d.ambito === 'estatal')
    expect(estatales).toHaveLength(2)
    expect(r.deducciones.some(d => d.titulo.includes('extranjero'))).toBe(true)
    expect(r.deducciones.some(d => d.titulo.includes('Ceuta y Melilla'))).toBe(true)
  })

  it('Galicia suma sus 6 deducciones específicas más la nota del ITSGF', () => {
    const r = calcularModelo714({
      bienes: [bien({ valor: 90_000_000 })],
      comunidadAutonoma: 'Galicia',
    })
    const autonomicas = r.deducciones.filter(d => d.ambito === 'autonomico')
    expect(autonomicas).toHaveLength(7)
    expect(r.deducciones.some(d => d.titulo.includes('agrarias'))).toBe(true)
    expect(r.deducciones.some(d => d.titulo.toLowerCase().includes('centros históricos'))).toBe(true)
    expect(r.porcentajeBonificacion).toBe(0.5)
  })

  it('Cataluña incluye la bonificación de propiedades forestales (95 %)', () => {
    const r = calcularModelo714({
      bienes: [bien({ valor: 90_000_000 })],
      comunidadAutonoma: 'Cataluña',
    })
    const forestal = r.deducciones.find(d => d.titulo.includes('forestales'))
    expect(forestal).toBeDefined()
    expect(forestal?.cuantia).toContain('95')
  })

  it('Madrid incluye el régimen transitorio del ITSGF y la bonificación del 100 %', () => {
    const r = calcularModelo714({
      bienes: [bien({ valor: 90_000_000 })],
      comunidadAutonoma: 'Madrid',
    })
    expect(r.porcentajeBonificacion).toBe(1)
    expect(r.deducciones.some(d => d.titulo.includes('ITSGF'))).toBe(true)
  })

  it('Ceuta y Melilla constan en el catálogo con la bonificación estatal del art. 33', () => {
    const r = calcularModelo714({
      bienes: [bien({ valor: 90_000_000 })],
      comunidadAutonoma: 'Ceuta',
    })
    expect(r.porcentajeBonificacion).toBe(0)
    expect(r.bonificacionAplicable).toContain('art. 33')
  })
})
