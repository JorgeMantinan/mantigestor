import { es, type DeepTraducciones } from './es'

export type Idioma = 'es' | 'en' | 'ca' | 'gl' | 'eu'
export type { DeepTraducciones }

// Solo 'es' entra estático en el bundle (fallback y valor por defecto).
// El resto de idiomas se cargan bajo demanda: ~340 KB menos en el chunk
// compartido de TODAS las rutas.
const cargadores: Record<Exclude<Idioma, 'es'>, () => Promise<DeepTraducciones>> = {
  en: async () => (await import('./en')).en,
  ca: async () => (await import('./ca')).ca,
  gl: async () => (await import('./gl')).gl,
  eu: async () => (await import('./eu')).eu,
}

const cache: Partial<Record<Idioma, DeepTraducciones>> = { es }

/** Carga las traducciones de un idioma (instantáneo si ya está en caché). */
export async function cargarTraducciones(idioma: Idioma): Promise<DeepTraducciones> {
  const yaCargadas = cache[idioma]
  if (yaCargadas) return yaCargadas
  try {
    const paquete = await cargadores[idioma as Exclude<Idioma, 'es'>]()
    cache[idioma] = paquete
    return paquete
  } catch {
    return es
  }
}

/** Traducciones disponibles de forma síncrona (fallback a 'es'). */
export function traduccionesDe(idioma: Idioma): DeepTraducciones {
  return cache[idioma] ?? es
}
