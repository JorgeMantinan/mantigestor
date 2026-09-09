'use client'

const CACHE_PREFIX = 'mantigestor_'
const CACHE_DURATION_MS = 24 * 60 * 60 * 1000 // 24 hours

interface CacheEntry<T> {
  data: T
  expires: number
}

export function guardarEnCache<T>(key: string, data: T): void {
  try {
    const entry: CacheEntry<T> = {
      data,
      expires: Date.now() + CACHE_DURATION_MS,
    }
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(entry))
  } catch {
    // Storage full or unavailable — silently fail
  }
}

export function obtenerDeCache<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key)
    if (!raw) return null
    const { data, expires } = JSON.parse(raw) as CacheEntry<T>
    if (Date.now() > expires) {
      localStorage.removeItem(CACHE_PREFIX + key)
      return null
    }
    return data
  } catch {
    return null
  }
}

export function limpiarCache(prefix?: string): void {
  try {
    const p = CACHE_PREFIX + (prefix ?? '')
    const keys: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k && k.startsWith(p)) keys.push(k)
    }
    keys.forEach(k => localStorage.removeItem(k))
  } catch {
    // ignore
  }
}
