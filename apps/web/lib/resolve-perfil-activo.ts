import { createServerClient } from '@supabase/ssr'
import { type NextRequest } from 'next/server'

export type RolPerfil = 'propietario' | 'gestor' | 'visualizador'

/**
 * Resuelve el perfilId activo para el usuario actual.
 * Lee el header `x-perfil-activo` (UUID del perfil seleccionado).
 * Si no existe o es el propio perfil, retorna el perfil propio del usuario.
 * Verifica que el usuario tenga acceso al perfil solicitado y devuelve también
 * el ROL sobre ese perfil: las rutas de escritura deben rechazar 'visualizador'
 * con esSoloLectura(rol) → 403.
 */
export async function resolvePerfilActivo(
  req: NextRequest
): Promise<{ perfilId: string; esPropio: boolean; rol: RolPerfil; error?: string }> {
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
  if (!user) return { perfilId: '', esPropio: false, rol: 'propietario', error: 'No autorizado' }

  // Obtener perfil propio
  const { data: perfilPropio } = await supabase
    .from('perfiles')
    .select('id')
    .eq('userId', user.id)
    .single()

  if (!perfilPropio) return { perfilId: '', esPropio: false, rol: 'propietario', error: 'Perfil no encontrado' }

  // Si no se pide otro perfil, retornar el propio
  const perfilSolicitado = req.headers.get('x-perfil-activo')
  if (!perfilSolicitado || perfilSolicitado === perfilPropio.id) {
    return { perfilId: perfilPropio.id, esPropio: true, rol: 'propietario' }
  }

  // Verificar que el usuario sea gestor/propietario/visualizador del perfil solicitado
  const { data: asociacion } = await supabase
    .from('perfil_asociado')
    .select('rol')
    .eq('ownerUserId', user.id)
    .eq('perfilId', perfilSolicitado)
    .in('rol', ['gestor', 'propietario', 'visualizador'])
    .single()

  if (!asociacion) {
    return { perfilId: perfilPropio.id, esPropio: true, rol: 'propietario', error: 'No tienes acceso a este perfil' }
  }

  return { perfilId: perfilSolicitado, esPropio: false, rol: (asociacion.rol as RolPerfil) ?? 'gestor' }
}

export function esSoloLectura(rol: string): boolean {
  return rol === 'visualizador'
}
