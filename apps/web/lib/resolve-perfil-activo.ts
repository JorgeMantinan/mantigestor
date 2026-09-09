import { createServerClient } from '@supabase/ssr'
import { type NextRequest } from 'next/server'

/**
 * Resuelve el perfilId activo para el usuario actual.
 * Lee el header `x-perfil-activo` (UUID del perfil seleccionado).
 * Si no existe o es el propio perfil, retorna el perfil propio del usuario.
 * Verifica que el usuario tenga acceso al perfil solicitado.
 */
export async function resolvePerfilActivo(
  req: NextRequest
): Promise<{ perfilId: string; esPropio: boolean; error?: string }> {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name: string) => req.cookies.get(name)?.value,
        set: () => {},
        remove: () => {},
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { perfilId: '', esPropio: false, error: 'No autorizado' }

  // Obtener perfil propio
  const { data: perfilPropio } = await supabase
    .from('perfiles')
    .select('id')
    .eq('userId', user.id)
    .single()

  if (!perfilPropio) return { perfilId: '', esPropio: false, error: 'Perfil no encontrado' }

  // Si no se pide otro perfil, retornar el propio
  const perfilSolicitado = req.headers.get('x-perfil-activo')
  if (!perfilSolicitado || perfilSolicitado === perfilPropio.id) {
    return { perfilId: perfilPropio.id, esPropio: true }
  }

  // Verificar que el usuario sea gestor/propietario del perfil solicitado
  const { data: asociacion } = await supabase
    .from('perfil_asociado')
    .select('rol')
    .eq('ownerUserId', user.id)
    .eq('perfilId', perfilSolicitado)
    .in('rol', ['gestor', 'propietario', 'visualizador'])
    .single()

  if (!asociacion) {
    return { perfilId: perfilPropio.id, esPropio: true, error: 'No tienes acceso a este perfil' }
  }

  return { perfilId: perfilSolicitado, esPropio: false }
}

export function esSoloLectura(rol: string): boolean {
  return rol === 'visualizador'
}
