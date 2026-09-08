const locks = new Map<string, number>()
const LOCK_DURATION_MS = 5 * 60 * 1000 // 5 minutes

export function acquireLock(perfilId: string): boolean {
  const now = Date.now()
  const existing = locks.get(perfilId)
  if (existing && now - existing < LOCK_DURATION_MS) {
    return false
  }
  locks.set(perfilId, now)
  return true
}

export function releaseLock(perfilId: string): void {
  locks.delete(perfilId)
}
