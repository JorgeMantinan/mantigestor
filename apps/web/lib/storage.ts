import { createClient } from '@/lib/supabase/client'

// Los buckets de Supabase Storage son PRIVADOS: en la BD solo se guarda la
// referencia (URL pública) y las URLs firmadas se generan al leer.
// Cliente: firmarUrlStorage / firmarUrlsStorage. Servidor: lib/storage-server.ts.

const EXPIRACION_DEFECTO = 3600 // 1 hora

interface ParteUrlStorage {
  bucket: string
  ruta: string
}

const PREFIJOS = ['/storage/v1/object/public/', '/storage/v1/object/sign/']

function parsearUrlStorage(url: string): ParteUrlStorage | null {
  for (const prefijo of PREFIJOS) {
    const idx = url.indexOf(prefijo)
    if (idx === -1) continue
    const resto = url.slice(idx + prefijo.length).split('?')[0] ?? ''
    const slash = resto.indexOf('/')
    if (slash <= 0) return null
    return {
      bucket: resto.slice(0, slash),
      ruta: decodeURIComponent(resto.slice(slash + 1)),
    }
  }
  return null
}

/** Convierte una URL pública de Storage a una firmada. Si no es de Storage, la devuelve igual. */
export async function firmarUrlStorage(
  url: string,
  expiracion: number = EXPIRACION_DEFECTO
): Promise<string> {
  const partes = parsearUrlStorage(url)
  if (!partes) return url
  try {
    const { data } = await createClient()
      .storage.from(partes.bucket)
      .createSignedUrl(partes.ruta, expiracion)
    return data?.signedUrl ?? url
  } catch {
    return url
  }
}

/** Firma varias URLs en lote (agrupadas por bucket). Devuelve el mismo array con URLs firmadas. */
export async function firmarUrlsStorage(
  urls: (string | null | undefined)[],
  expiracion: number = EXPIRACION_DEFECTO
): Promise<(string | null | undefined)[]> {
  const salida = [...urls]
  const parseados = urls.map(u => (u ? parsearUrlStorage(u) : null))

  const buckets = new Set<string>()
  for (const p of parseados) {
    if (p) buckets.add(p.bucket)
  }

  for (const bucket of buckets) {
    const indices: number[] = []
    const rutas: string[] = []
    parseados.forEach((p, i) => {
      if (p && p.bucket === bucket) {
        indices.push(i)
        rutas.push(p.ruta)
      }
    })
    try {
      const { data, error } = await createClient()
        .storage.from(bucket)
        .createSignedUrls(rutas, expiracion)
      if (!error && data) {
        data.forEach((entrada, k) => {
          const i = indices[k]
          if (i !== undefined && entrada?.signedUrl) {
            salida[i] = entrada.signedUrl
          }
        })
      }
    } catch {
      // si el lote falla, se conservan las URLs originales
    }
  }

  return salida
}
