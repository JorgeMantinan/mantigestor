import { describe, it, expect } from 'vitest'
import { resolverJurisdiccion } from '../jurisdiccion'

describe('resolverJurisdiccion', () => {
  it('resuelve territorios forales con acentos y mayúsculas', () => {
    expect(resolverJurisdiccion('País Vasco (Álava)').regimen).toBe('FORAL_ALAVA')
    expect(resolverJurisdiccion('bizkaia').regimen).toBe('FORAL_BIZKAIA')
    expect(resolverJurisdiccion('GIPUZKOA').regimen).toBe('FORAL_GIPUZKOA')
    expect(resolverJurisdiccion('Comunidad Foral de Navarra').regimen).toBe('NAVARRA')
  })

  it('marca los forales como no aptos para escala común', () => {
    const r = resolverJurisdiccion('Vizcaya')
    expect(r.usaEscalaComun).toBe(false)
  })

  it('resuelve comunidades de régimen común', () => {
    const r = resolverJurisdiccion('Comunidad de Madrid')
    expect(r.regimen).toBe('COMUN')
    expect(r.usaEscalaComun).toBe(true)
  })

  it('normaliza acentos en el nombre', () => {
    expect(resolverJurisdiccion('Aragón').nombreNormalizado).toBe('aragon')
  })

  it('lanza error con entrada vacía', () => {
    expect(() => resolverJurisdiccion('')).toThrow('Indica una comunidad')
  })
})
