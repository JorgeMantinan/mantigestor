import { describe, it, expect } from 'vitest'
import { calcularModelo170, type Operacion170 } from '../modelo-170'

function op(overrides: Partial<Operacion170>): Operacion170 {
  return { fecha: '2026-03-15', importeCents: 10_000, medio: 'tarjeta', ...overrides }
}

describe('calcularModelo170 — versión ≤ 2025 (declaración anual, tarjetas)', () => {
  it('es anual, con plazo en febrero del año siguiente', () => {
    const res = calcularModelo170({ anyo: 2025, operaciones: [op({ fecha: '2025-06-10', importeCents: 50_000 })] })
    expect(res.version).toBe('anual')
    expect(res.mes).toBeNull()
    expect(res.plazo).toContain('febrero de 2026')
    expect(res.totalCents).toBe(50_000)
    expect(res.totalTarjetaCents).toBe(50_000)
    expect(res.numOperaciones).toBe(1)
  })

  it('descarta los pagos con móvil (solo desde 2026) y avisa', () => {
    const res = calcularModelo170({
      anyo: 2025,
      operaciones: [
        op({ fecha: '2025-06-10', importeCents: 50_000, medio: 'tarjeta' }),
        op({ fecha: '2025-06-11', importeCents: 30_000, medio: 'movil' }),
      ],
    })
    expect(res.totalCents).toBe(50_000)
    expect(res.totalMovilCents).toBe(0)
    expect(res.avisos.some(a => a.includes('2026'))).toBe(true)
  })

  it('ignora operaciones de otros ejercicios y agrupa por mes', () => {
    const res = calcularModelo170({
      anyo: 2025,
      operaciones: [
        op({ fecha: '2025-01-15', importeCents: 10_000 }),
        op({ fecha: '2025-01-20', importeCents: 20_000 }),
        op({ fecha: '2026-01-15', importeCents: 99_999 }),
      ],
    })
    expect(res.numOperaciones).toBe(2)
    expect(res.porMes[0]).toBe(30_000)
    expect(res.totalCents).toBe(30_000)
  })
})

describe('calcularModelo170 — versión ≥ 2026 (declaración mensual, tarjetas + móvil)', () => {
  it('es mensual con plazo el mes natural siguiente', () => {
    const res = calcularModelo170({ anyo: 2026, mes: 3, operaciones: [] })
    expect(res.version).toBe('mensual')
    expect(res.mes).toBe(3)
    expect(res.plazo).toContain('Mes natural siguiente')
    expect(res.avisos.some(a => a.includes('marzo'))).toBe(true)
  })

  it('suma tarjetas y móviles del mes declarado y filtra los demás meses', () => {
    const res = calcularModelo170({
      anyo: 2026,
      mes: 3,
      operaciones: [
        op({ fecha: '2026-03-05', importeCents: 100_000, medio: 'tarjeta' }),
        op({ fecha: '2026-03-20', importeCents: 40_000, medio: 'movil' }),
        op({ fecha: '2026-04-02', importeCents: 70_000, medio: 'tarjeta' }),
      ],
    })
    expect(res.totalTarjetaCents).toBe(100_000)
    expect(res.totalMovilCents).toBe(40_000)
    expect(res.totalCents).toBe(140_000)
    expect(res.numOperaciones).toBe(2)
  })

  it('sin mes indicado en 2026 avisa que debe declararse por mes', () => {
    const res = calcularModelo170({ anyo: 2026, operaciones: [op({ fecha: '2026-03-05' })] })
    expect(res.mes).toBeNull()
    expect(res.numOperaciones).toBe(0)
    expect(res.avisos.some(a => a.includes('mes'))).toBe(true)
  })
})
