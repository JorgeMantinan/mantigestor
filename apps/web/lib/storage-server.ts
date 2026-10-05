import { createAdminClient } from '@/lib/supabase/admin'

// Firma de URLs de Storage desde el servidor (service_role).
// Ver lib/storage.ts para la versión de cliente.

const EXPIRACION_DEFECTO = 3600 // 1 hora
const PREFIJOS = ['/storage/v1/object/public/', '/storage/v1/object/sign/']

interface ParteUrlStorage {
  bucket: string
  ruta: string
}

/** Parsea URLs de Storage en formato público o firmado. Devuelve null si no es de Storage. */
export function parsearUrlStorage(url: string): ParteUrlStorage | null {
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

/**
 * Primer componente del path (la carpeta del perfil, p. ej. `<perfilId>/archivo.pdf`).
 * Se usa para comprobar que el documento pertenece al perfil activo antes de leerlo.
 */
export function carpetaDeUrlStorage(url: string): string | null {
  const partes = parsearUrlStorage(url)
  if (!partes) return null
  const slash = partes.ruta.indexOf('/')
  if (slash <= 0) return null
  return partes.ruta.slice(0, slash)
}

/** Convierte una URL de Storage (pública o firmada) a una firmada. Si no es de Storage, la devuelve igual. */
export async function firmarUrlAdmin(
  url: string,
  expiracion: number = EXPIRACION_DEFECTO
): Promise<string> {
  const partes = parsearUrlStorage(url)
  if (!partes) return url
  try {
    const { data } = await createAdminClient()
      .storage.from(partes.bucket)
      .createSignedUrl(partes.ruta, expiracion)
    return data?.signedUrl ?? url
  } catch {
    return url
  }
}
