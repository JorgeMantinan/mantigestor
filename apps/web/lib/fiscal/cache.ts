import type { DatosFiscales } from '@/app/(dashboard)/fiscal/calculadoras/types'

interface CacheEntry {
  ts: number
  data: DatosFiscales
  avisos: string[]
}

const TTL_MS = 24 * 60 * 60 * 1000

export function leerCache(comunidad: string, taxYear: number): CacheEntry | null {
  if (typeof window === 'undefined') return null
  try {
    const bruto = window.sessionStorage.getItem(`fiscal-datos-v1-${comunidad}-${taxYear}`)
    if (!bruto) return null
    const entrada = JSON.parse(bruto) as CacheEntry
    if (!entrada?.data || Date.now() - entrada.ts > TTL_MS) return null
    return entrada
  } catch {
    return null
  }
}

export function guardarCache(comunidad: string, taxYear: number, data: DatosFiscales, avisos: string[]): void {
  if (typeof window === 'undefined') return
  try {
    window.sessionStorage.setItem(`fiscal-datos-v1-${comunidad}-${taxYear}`, JSON.stringify({ ts: Date.now(), data, avisos }))
  } catch {
    // cuota de almacenamiento llena: sin caché no pasa nada
  }
}
