import { describe, it, expect } from 'vitest'
import { calcularModelo233 } from '../modelo-233'

describe('calcularModelo233 — operaciones vinculadas', () => {
  it('avisa cuando el total supera el umbral de 250.000€', () => {
    const r = calcularModelo233({
      operaciones: [
        { nifContraparte: 'B12345678', importe: 180_000 },
        { nifContraparte: 'B87654321', importe: 120_000 },
      ],
    })
    expect(r.totalOperaciones).toBe(300_000)
    expect(r.umbral).toBe(250_000)
    expect(r.superaUmbral).toBe(true)
  })

  it('no avisa cuando el total es igual o inferior al umbral', () => {
    const r = calcularModelo233({
      operaciones: [{ nifContraparte: 'B12345678', importe: 250_000 }],
    })
    expect(r.superaUmbral).toBe(false)
  })

  it('acepta un umbral configurable', () => {
    const r = calcularModelo233({
      operaciones: [{ nifContraparte: 'B12345678', importe: 30_000 }],
      umbral: 25_000,
    })
    expect(r.umbral).toBe(25_000)
    expect(r.superaUmbral).toBe(true)
  })

  it('devuelve total cero y no supera umbral sin operaciones', () => {
    const r = calcularModelo233({ operaciones: [] })
    expect(r.totalOperaciones).toBe(0)
    expect(r.superaUmbral).toBe(false)
  })

  it('conserva el detalle de cada operación', () => {
    const ops = [
      { nifContraparte: 'B12345678', importe: 50_000 },
      { nifContraparte: '12345678Z', importe: 30_000 },
    ]
    const r = calcularModelo233({ operaciones: ops })
    expect(r.operaciones).toHaveLength(2)
    expect(r.operaciones[0]).toMatchObject({ nifContraparte: 'B12345678', importe: 50_000 })
    expect(r.totalOperaciones).toBe(80_000)
  })
})