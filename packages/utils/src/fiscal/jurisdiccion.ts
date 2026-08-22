export type RegimenJurisdiccion =
  | 'COMUN'
  | 'FORAL_ALAVA'
  | 'FORAL_BIZKAIA'
  | 'FORAL_GIPUZKOA'
  | 'NAVARRA'

export interface JurisdiccionResuelta {
  nombreNormalizado: string
  regimen: RegimenJurisdiccion
  usaEscalaComun: boolean
}

const FORALES: Array<[RegExp, RegimenJurisdiccion]> = [
  [/alava|araba/, 'FORAL_ALAVA'],
  [/bizkaia|vizcaya/, 'FORAL_BIZKAIA'],
  [/gipuzkoa|guipuzcoa/, 'FORAL_GIPUZKOA'],
  [/navarra/, 'NAVARRA'],
]

export function normalizarTerritorio(entrada: string): string {
  return String(entrada ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

export function resolverJurisdiccion(entrada: string): JurisdiccionResuelta {
  const nombre = normalizarTerritorio(entrada)
  if (!nombre) throw new Error('Indica una comunidad autónoma o territorio')

  for (const [patron, regimen] of FORALES) {
    if (patron.test(nombre)) {
      return { nombreNormalizado: nombre, regimen, usaEscalaComun: false }
    }
  }

  return { nombreNormalizado: nombre, regimen: 'COMUN', usaEscalaComun: true }
}
