'use client'

const CACHE_PREFIX = 'mantigestor_'
const CACHE_DURATION_MS = 24 * 60 * 60 * 1000 // 24 hours
const SHORT_CACHE_MS = 5 * 60 * 1000 // 5 minutes for volatile data

interface CacheEntry<T> {
  data: T
  expires: number
}

export function guardarEnCache<T>(key: string, data: T, ttlMs?: number): void {
  try {
    const entry: CacheEntry<T> = {
      data,
      expires: Date.now() + (ttlMs ?? CACHE_DURATION_MS),
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

// --- Offline-specific cache helpers ---

const DASHBOARD_CACHE_KEY = 'cache_dashboard'
const FACTURAS_CACHE_KEY = 'cache_facturas'
const FISCAL_CACHE_KEY = 'cache_fiscal'

export function cacheDashboard(data: unknown): void {
  guardarEnCache(DASHBOARD_CACHE_KEY, data, SHORT_CACHE_MS)
}

export function obtenerDashboardCache<T>(): T | null {
  return obtenerDeCache<T>(DASHBOARD_CACHE_KEY)
}

export function cacheFacturas(perfilId: string, data: unknown): void {
  guardarEnCache(`${FACTURAS_CACHE_KEY}_${perfilId}`, data, SHORT_CACHE_MS)
}

export function obtenerFacturasCache<T>(perfilId: string): T | null {
  return obtenerDeCache<T>(`${FACTURAS_CACHE_KEY}_${perfilId}`)
}

export function cacheFiscal(modelo: string, data: unknown): void {
  guardarEnCache(`${FISCAL_CACHE_KEY}_${modelo}`, data, CACHE_DURATION_MS)
}

export function obtenerFiscalCache<T>(modelo: string): T | null {
  return obtenerDeCache<T>(`${FISCAL_CACHE_KEY}_${modelo}`)
}

// --- Sync queue for pending offline operations ---

export interface SyncOperation {
  id: string
  url: string
  method: string
  body: unknown
  headers?: Record<string, string>
  createdAt: number
  retries: number
}

const SYNC_QUEUE_KEY = 'mantigestor_sync_queue'
const MAX_RETRIES = 3

export function addToSyncQueue(operation: Omit<SyncOperation, 'id' | 'createdAt' | 'retries'>): void {
  try {
    const queue = getSyncQueue()
    queue.push({
      ...operation,
      id: crypto.randomUUID(),
      createdAt: Date.now(),
      retries: 0,
    })
    localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue))
  } catch {
    // ignore
  }
}

export function getSyncQueue(): SyncOperation[] {
  try {
    const raw = localStorage.getItem(SYNC_QUEUE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function removeSyncOperation(id: string): void {
  try {
    const queue = getSyncQueue().filter(op => op.id !== id)
    localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue))
  } catch {
    // ignore
  }
}

export function incrementRetries(id: string): void {
  try {
    const queue = getSyncQueue().map(op =>
      op.id === id ? { ...op, retries: op.retries + 1 } : op
    )
    localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue))
  } catch {
    // ignore
  }
}

export async function processSyncQueue(): Promise<void> {
  if (!navigator.onLine) return

  const queue = getSyncQueue()
  for (const op of queue) {
    if (op.retries >= MAX_RETRIES) {
      removeSyncOperation(op.id)
      continue
    }
    try {
      const response = await fetch(op.url, {
        method: op.method,
        headers: { 'Content-Type': 'application/json', ...op.headers },
        body: op.method !== 'GET' && op.method !== 'DELETE' ? JSON.stringify(op.body) : undefined,
      })
      if (response.ok) {
        removeSyncOperation(op.id)
      } else {
        incrementRetries(op.id)
      }
    } catch {
      incrementRetries(op.id)
    }
  }
}
