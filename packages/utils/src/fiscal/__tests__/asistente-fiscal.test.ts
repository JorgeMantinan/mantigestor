import { describe, it, expect } from 'vitest'
import { asistenteFiscal, agruparModelosPorCategoria, modelosObligatorios, type SituacionFiscal } from '../asistente-fiscal'

describe('asistenteFiscal', () => {
  const basicoAutonomo: SituacionFiscal = {
    actividad: 'autonomo',
    tieneEmpleados: false,
    retencionesProfesionales: false,
    arrendamientoInmuebles: false,
    criptomonedas: false,
    bienesExtranjero: false,
    paraisosFiscales: false,
    transparenciaFiscal: false,
    donaciones: false,
    inversionesExtranjeras: false,
    noResidente: false,
    rentasExentas: false,
    plusvalias: false,
    comunidadAutonoma: 'Madrid',
  }

  it('devuelve modelos básicos para un autónomo', () => {
    const modelos = asistenteFiscal(basicoAutonomo)
    expect(modelos.length).toBeGreaterThan(0)
    const modelosNombres = modelos.map(m => m.modelo)
    expect(modelosNombres).toContain('303')
    expect(modelosNombres).toContain('390')
    expect(modelosNombres).toContain('130')
    expect(modelosNombres).toContain('100')
    expect(modelosNombres).toContain('RETA')
  })

  it('incluye modelos de empleados si tiene empleados', () => {
    const modelos = asistenteFiscal({ ...basicoAutonomo, tieneEmpleados: true })
    const modelosNombres = modelos.map(m => m.modelo)
    expect(modelosNombres).toContain('111')
    expect(modelosNombres).toContain('190')
  })

  it('incluye modelos de criptomonedas si aplica', () => {
    const modelos = asistenteFiscal({ ...basicoAutonomo, criptomonedas: true })
    const modelosNombres = modelos.map(m => m.modelo)
    expect(modelosNombres).toContain('231')
    expect(modelosNombres).toContain('721')
  })

  it('incluye modelos de extranjero si aplica', () => {
    const modelos = asistenteFiscal({ ...basicoAutonomo, bienesExtranjero: true })
    const modelosNombres = modelos.map(m => m.modelo)
    expect(modelosNombres).toContain('720')
  })

  it('no incluye modelos de sociedad para autónomos', () => {
    const modelos = asistenteFiscal(basicoAutonomo)
    const modelosNombres = modelos.map(m => m.modelo)
    expect(modelosNombres).not.toContain('200')
    expect(modelosNombres).not.toContain('104')
  })

  it('incluye modelos de sociedad si es sociedad', () => {
    const modelos = asistenteFiscal({ ...basicoAutonomo, actividad: 'sociedad' })
    const modelosNombres = modelos.map(m => m.modelo)
    expect(modelosNombres).toContain('200')
    expect(modelosNombres).toContain('104')
  })

  it('filtra solo obligatorios', () => {
    const todos = asistenteFiscal(basicoAutonomo)
    const obligatorios = modelosObligatorios(todos)
    expect(obligatorios.length).toBeGreaterThan(0)
    expect(obligatorios.every(m => m.obligatorio)).toBe(true)
  })

  it('agrupa por categoría', () => {
    const modelos = asistenteFiscal(basicoAutonomo)
    const grupos = agruparModelosPorCategoria(modelos)
    expect(grupos.iva).toBeDefined()
    expect(grupos.irpf).toBeDefined()
  })

  it('caso completo: autónomo con empleados, cripto, extranjero', () => {
    const sit: SituacionFiscal = {
      ...basicoAutonomo,
      tieneEmpleados: true,
      criptomonedas: true,
      bienesExtranjero: true,
      donaciones: true,
    }
    const modelos = asistenteFiscal(sit)
    expect(modelos.length).toBeGreaterThan(10)
    const modelosNombres = modelos.map(m => m.modelo)
    expect(modelosNombres).toContain('303')
    expect(modelosNombres).toContain('130')
    expect(modelosNombres).toContain('111')
    expect(modelosNombres).toContain('231')
    expect(modelosNombres).toContain('720')
    expect(modelosNombres).toContain('182')
    expect(modelosNombres).toContain('RETA')
  })
})
