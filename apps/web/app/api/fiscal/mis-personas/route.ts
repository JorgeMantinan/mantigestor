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

    // Obtener asociaciones donde soy gestor
    const { data: asociaciones } = await supabase
      .from('perfil_asociado')
      .select('perfilId, rol')
      .eq('ownerUserId', user.id)

    // Obtener datos de los perfiles asociados
    const personas = []
    if (asociaciones && asociaciones.length > 0) {
      const ids = asociaciones.map(a => a.perfilId)
      const { data: perfiles } = await supabase
        .from('perfiles')
        .select('id, nombre, email')
        .in('id', ids)

      if (perfiles) {
        for (const p of perfiles) {
          const asoc = asociaciones.find(a => a.perfilId === p.id)
          personas.push({
            perfilId: p.id,
            nombre: p.nombre,
            email: p.email,
            rol: asoc?.rol ?? 'gestor',
          })
        }
      }
    }

    return NextResponse.json({ personas, perfilPropioId: perfilPropio.id })
  } catch (error) {
    return serverError(error)
  }
}
