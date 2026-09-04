import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser, unauthorized, serverError } from '@/lib/api-helpers'
import { createServerClient } from '@supabase/ssr'

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req)
    if (!user) return unauthorized()

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

    // Obtener el propio perfil
    const { data: perfilPropio } = await supabase
      .from('perfiles')
      .select('id')
      .eq('userId', user.id)
      .single()

    if (!perfilPropio) return NextResponse.json({ personas: [], perfilPropioId: null })

    // Obtener asociaciones donde soy gestor/propietario (yo gestiono a otros)
    const { data: asociaciones } = await supabase
      .from('perfil_asociado')
      .select('perfilId, rol')
      .eq('ownerUserId', user.id)

    // Obtener personas que me gestionan a mí
    const { data: meGestionan } = await supabase
      .from('perfil_asociado')
      .select('ownerUserId, rol')
      .eq('perfilId', perfilPropio.id)

    // Obtener datos de los perfiles asociados
    const personas = []
    if (asociaciones && asociaciones.length > 0) {
      const ids = asociaciones.map(a => a.perfilId)

      // Intentar función SQL primero (bypasea RLS)
      const { data: perfilesFn } = await supabase
        .rpc('obtener_perfiles_por_ids', { p_ids: ids })

      let perfiles = perfilesFn

      // Fallback: query directa
      if (!perfilesFn || perfilesFn.length === 0) {
        const { data: perfilesDirect } = await supabase
          .from('perfiles')
          .select('id, nombre, email')
          .in('id', ids)
        perfiles = perfilesDirect
      }

      if (perfiles) {
        for (const p of perfiles) {
          const asoc = asociaciones.find(a => a.perfilId === p.id)
          personas.push({
            perfilId: p.id,
            nombre: p.nombre,
            email: p.email,
            rol: asoc?.rol ?? 'gestor',
            tipo: 'gestiono',
          })
        }
      }
    }

    // Añadir personas que me gestionan a mí
    if (meGestionan && meGestionan.length > 0) {
      const gestorIds = meGestionan.map(a => a.ownerUserId)

      const { data: gestoresFn } = await supabase
        .rpc('obtener_perfiles_por_ids', { p_ids: gestorIds })

      let gestores = gestoresFn

      if (!gestoresFn || gestoresFn.length === 0) {
        const { data: gestoresDirect } = await supabase
          .from('perfiles')
          .select('id, nombre, email')
          .in('id', gestorIds)
        gestores = gestoresDirect
      }

      if (gestores) {
        for (const g of gestores) {
          // No duplicar si ya está en la lista
          if (!personas.find(p => p.perfilId === g.id)) {
            personas.push({
              perfilId: g.id,
              nombre: g.nombre,
              email: g.email,
              rol: 'gestor',
              tipo: 'me_gestiona',
            })
          }
        }
      }
    }

    return NextResponse.json({ personas, perfilPropioId: perfilPropio.id })
  } catch (error) {
    return serverError(error)
  }
}
