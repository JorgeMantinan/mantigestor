import { es, type DeepTraducciones } from './es'
import { en } from './en'

export type Idioma = 'es' | 'en'

export const traducciones: Record<Idioma, DeepTraducciones> = { es, en }

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
