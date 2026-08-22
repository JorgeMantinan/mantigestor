import { describe, it, expect } from 'vitest'
import { proximosPlazos } from '../plazos'

const HOY = new Date('2026-08-22T12:00:00Z')

function plazo(modelo: string | null, periodo: string, fechaIso: string | null) {
  return {
    modeloNumero: modelo,
    periodo,
    fechaLimiteReferencia: fechaIso ? new Date(fechaIso) : null,
  }
}

describe('proximosPlazos', () => {
  it('ordena por proximidad y calcula días restantes', () => {
    const r = proximosPlazos([
      plazo('MOD303', '3T 2026', '2026-10-20'),
      plazo('MOD111', 'Agosto 2026', '2026-09-20'),
      plazo('MOD200', '2T 2026', '2026-07-25'),
    ], HOY)

    expect(r).toHaveLength(2)
    expect(r[0]?.modeloNumero).toBe('MOD111')
    expect(r[0]?.diasRestantes).toBe(29)
    expect(r[1]?.diasRestantes).toBe(59)
  })

  it('incluye plazos que vencen hoy con diasRestantes 0', () => {
    const r = proximosPlazos([plazo('MOD303', '2T 2026', '2026-08-22')], HOY)
    expect(r).toHaveLength(1)
    expect(r[0]?.diasRestantes).toBe(0)
  })

  it('excluye fechas nulas y vencidas', () => {
    const r = proximosPlazos([
      plazo('MOD390', 'Renta 2025', null),
      plazo('MOD200', '1T 2026', '2026-01-20'),
    ], HOY)
    expect(r).toHaveLength(0)
  })

  it('respeta el límite de resultados', () => {
    const muchos = [1, 2, 3, 4, 5].map(i => plazo(`MOD00${i}`, `P${i}`, `2026-09-0${i}`))
    expect(proximosPlazos(muchos, HOY)).toHaveLength(5)
    expect(proximosPlazos(muchos, HOY, 2)).toHaveLength(2)
  })
})
