import { es, type DeepTraducciones } from './es'
import { en } from './en'
import { ca } from './ca'
import { gl } from './gl'
import { eu } from './eu'

export type Idioma = 'es' | 'en' | 'ca' | 'gl' | 'eu'

export const traducciones: Record<Idioma, DeepTraducciones> = { es, en, ca, gl, eu }

export function t(idioma: Idioma, path: string): string {
  const keys = path.split('.')
  let result: unknown = traducciones[idioma]
  for (const key of keys) {
    if (result && typeof result === 'object' && key in result) {
      result = (result as Record<string, unknown>)[key]
    } else {
      return path
    }
  }
  return typeof result === 'string' ? result : path
}
