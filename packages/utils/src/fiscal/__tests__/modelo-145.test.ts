import { describe, it, expect } from 'vitest'
import { calcularModelo145 } from '../modelo-145'

describe('calcularModelo145 — retención IRPF del trabajo', () => {
  it('devuelve retención 0% para rendimientos muy bajos', () => {
    const r = calcularModelo145({ salarioBrutoAnual: 10_000 })
    expect(r.tipoRetencionPct).toBe(0)
    expect(r.cuotaRetencion).toBe(0)
  })

  it('aplica una retención creciente para un salario medio', () => {
    const r = calcularModelo145({ salarioBrutoAnual: 30_000 })
    expect(r.tipoRetencionPct).toBeGreaterThan(0)
    expect(r.cuotaRetencion).toBeGreaterThan(0)
    expect(r.cuotaSS).toBeGreaterThan(2_000) // ~7,13% de 30.000
  })

  it('superior renta produce mayor tipo de retención', () => {
    const alto = calcularModelo145({ salarioBrutoAnual: 80_000 })
    const bajo = calcularModelo145({ salarioBrutoAnual: 30_000 })
    expect(alto.tipoRetencionPct).toBeGreaterThan(bajo.tipoRetencionPct)
  })

  it('los hijos reducen la retención vía mínimo por descendientes', () => {
    const conHijos = calcularModelo145({ salarioBrutoAnual: 30_000, hijos: 2 })
    const sinHijos = calcularModelo145({ salarioBrutoAnual: 30_000 })
    expect(conHijos.minimoDescendientes).toBe(2_400 + 2_700)
    expect(conHijos.tipoRetencionPct).toBeLessThan(sinHijos.tipoRetencionPct)
  })

  it('dos pagadores genera aviso de retención mínima', () => {
    const r = calcularModelo145({ salarioBrutoAnual: 30_000, numeroPagadores: 2 })
    expect(r.avisos.some(a => a.includes('dos o más pagadores'))).toBe(true)
  })
})
