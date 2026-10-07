/**
 * Purga TODO dato privado cacheado en el navegador (Cache Storage del service
 * worker, localStorage de facturas/chat/offline/fiscal, sessionStorage y la
 * cookie de perfil activo). Solo se conservan preferencias inertes.
 *
 * Se ejecuta al hacer logout (Header) y cuando la sesión desaparece
 * (expiración/token revocado) en useAuth — un equipo compartido no debe
 * conservar datos tras caducar la sesión.
 */
const CONSERVAR = new Set([
  'idioma',
  'theme',
  'onboarding_dismissed',
  'mantigestor_onboarding_completado',
  'milestone-100-seen',
])

export async function purgarDatosPrivados(): Promise<void> {
  try {
    await Promise.all((await caches.keys()).map((k) => caches.delete(k)))
  } catch {
    // Cache Storage no disponible
  }

  try {
    const borrar: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k && !CONSERVAR.has(k)) borrar.push(k)
    }
    borrar.forEach((k) => localStorage.removeItem(k))
  } catch {
    // localStorage no disponible
  }

  try {
    sessionStorage.clear()
  } catch {
    // sessionStorage no disponible
  }

  try {
    document.cookie = 'perfilActivoId=; path=/; max-age=0; Secure; SameSite=Lax'
  } catch {
    // entorno sin document
  }
}
