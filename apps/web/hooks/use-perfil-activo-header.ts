'use client'

import { usePersonaActiva } from '@/contexts/persona-activa-context'

/**
 * Returns headers to include in fetch calls so the API knows which perfil is active.
 */
export function usePerfilActivoHeader(): Record<string, string> {
  const { perfilActivoId } = usePersonaActiva()

  if (!perfilActivoId) return {}

  return { 'x-perfil-activo': perfilActivoId }
}
