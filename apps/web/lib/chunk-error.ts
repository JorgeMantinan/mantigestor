const PATRONES_CHUNK = [
  /Loading chunk [\w-]+ failed/i,
  /Loading CSS chunk/i,
  /Failed to fetch dynamically imported module/i,
  /Importing a module script failed/i,
  /error loading dynamic import module/i,
  /dynamically imported module/i,
  /ChunkLoadError/,
]

const CLAVE_RELOAD = 'chunk-error-reload-at'
const VENTANA_MS = 15_000

export function isChunkLoadError(error: unknown): boolean {
  let mensaje = ''
  if (typeof error === 'string') {
    mensaje = error
  } else if (error instanceof Error) {
    mensaje = `${error.name} ${error.message}`
  } else if (error && typeof error === 'object' && 'message' in error) {
    const m = (error as { message?: unknown }).message
    mensaje = typeof m === 'string' ? m : ''
  }
  if (!mensaje) return false
  return PATRONES_CHUNK.some((re) => re.test(mensaje))
}

export function tryChunkReload(): boolean {
  if (typeof window === 'undefined') return false
  try {
    const previo = Number(sessionStorage.getItem(CLAVE_RELOAD) ?? 0)
    if (Date.now() - previo < VENTANA_MS) return false
    sessionStorage.setItem(CLAVE_RELOAD, String(Date.now()))
    window.location.reload()
    return true
  } catch {
    return false
  }
}
