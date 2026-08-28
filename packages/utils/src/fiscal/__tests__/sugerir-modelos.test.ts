import { describe, it, expect } from 'vitest'
import { sugerirModelos } from '../sugerir-modelos'

describe('sugerirModelos', () => {
  it('factura de gasto sugiere 303, 130, 390', () => {
    const r = sugerirModelos({
      tipo: 'gasto',
      iva: 21,
      baseImponible: 100000,
      nifContraparte: 'B12345678',
    })
    const modelos = r.map(m => m.modelo)
    expect(modelos).toContain('303')
    expect(modelos).toContain('130')
    expect(modelos).toContain('390')
  })

  it('factura de ingreso sugiere 303, 130, 390', () => {
    const r = sugerirModelos({
      tipo: 'ingreso',
      iva: 21,
      baseImponible: 200000,
      nifContraparte: 'B87654321',
    })
    const modelos = r.map(m => m.modelo)
    expect(modelos).toContain('303')
    expect(modelos).toContain('130')
    expect(modelos).toContain('390')
  })

  it('NIF francés con IVA 0% sugiere 349 y 303 exenta', () => {
    const r = sugerirModelos({
      tipo: 'ingreso',
      iva: 0,
      baseImponible: 50000,
      nifContraparte: 'FR12345678901',
    })
    const modelos = r.map(m => m.modelo)
    expect(modelos).toContain('349')
    expect(modelos).toContain('303')
    const razon349 = r.find(m => m.modelo === '349')
    expect(razon349?.razon).toContain('Francia')
  })

  it('NIF español no sugiere 349', () => {
    const r = sugerirModelos({
      tipo: 'gasto',
      iva: 21,
      baseImponible: 100000,
      nifContraparte: '12345678Z',
    })
    const modelos = r.map(m => m.modelo)
    expect(modelos).not.toContain('349')
  })

  it('NIF alemán sugiere 349', () => {
    const r = sugerirModelos({
      tipo: 'gasto',
      iva: 21,
      baseImponible: 30000,
      nifContraparte: 'DE123456789',
    })
    const modelos = r.map(m => m.modelo)
    expect(modelos).toContain('349')
  })

  it('ingreso con NIF de empresa y IVA 21% sugiere 111', () => {
    const r = sugerirModelos({
      tipo: 'ingreso',
      iva: 21,
      baseImponible: 50000,
      nifContraparte: 'B12345678',
    })
    const modelos = r.map(m => m.modelo)
    expect(modelos).toContain('111')
  })

  it('gasto no sugiere 111', () => {
    const r = sugerirModelos({
      tipo: 'gasto',
      iva: 21,
      baseImponible: 50000,
      nifContraparte: 'B12345678',
    })
    const modelos = r.map(m => m.modelo)
    expect(modelos).not.toContain('111')
  })

  it('factura sin tipo sugiere 303 y 390 pero no 130', () => {
    const r = sugerirModelos({
      tipo: null,
      iva: 21,
      baseImponible: 100000,
      nifContraparte: null,
    })
    const modelos = r.map(m => m.modelo)
    expect(modelos).toContain('303')
    expect(modelos).toContain('390')
    expect(modelos).not.toContain('130')
  })

  it('factura sin NIF no sugiere 349', () => {
    const r = sugerirModelos({
      tipo: 'gasto',
      iva: 10,
      baseImponible: 50000,
      nifContraparte: null,
    })
    const modelos = r.map(m => m.modelo)
    expect(modelos).not.toContain('349')
  })

  it('resultados son deduplicados', () => {
    const r = sugerirModelos({
      tipo: 'ingreso',
      iva: 21,
      baseImponible: 100000,
      nifContraparte: 'B12345678',
    })
    const modelos = r.map(m => m.modelo)
    const unicos = [...new Set(modelos)]
    expect(modelos).toEqual(unicos)
  })

  it('cada sugerencia tiene modelo, seccion y razon', () => {
    const r = sugerirModelos({
      tipo: 'gasto',
      iva: 10,
      baseImponible: 25000,
      nifContraparte: 'B99999999',
    })
    for (const s of r) {
      expect(s.modelo).toBeTruthy()
      expect(s.seccion).toBeTruthy()
      expect(s.razon).toBeTruthy()
      expect(s.seccion).toMatch(/^modelo/)
    }
  })
})
