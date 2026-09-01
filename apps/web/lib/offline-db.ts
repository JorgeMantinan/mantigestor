'use client'

const TTL_MS = 24 * 60 * 60 * 1000
const PREFIX = 'mantigestor_offline_'

interface OfflineEntry<T> {
  datos: T
  guardadoEn: number
}

export function guardarOffline<T>(clave: string, datos: T): void {
  try {
    const entry: OfflineEntry<T> = { datos, guardadoEn: Date.now() }
    localStorage.setItem(PREFIX + clave, JSON.stringify(entry))
  } catch {
    console.error('Error guardando datos offline:', clave)
  }
}

export function obtenerOffline<T>(clave: string): T | null {
  try {
    const raw = localStorage.getItem(PREFIX + clave)
    if (!raw) return null
    const entry: OfflineEntry<T> = JSON.parse(raw)
    if (Date.now() - entry.guardadoEn > TTL_MS) {
      localStorage.removeItem(PREFIX + clave)
      return null
    }
    return entry.datos
  } catch {
    return null
  }
}

export function eliminarOffline(clave: string): void {
  localStorage.removeItem(PREFIX + clave)
}

export function listarOffline(prefijo: string): string[] {
  const result: string[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key && key.startsWith(PREFIX + prefijo)) {
      result.push(key.slice(PREFIX.length))
    }
  }
  return result
}
