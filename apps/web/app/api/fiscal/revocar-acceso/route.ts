import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser, unauthorized, badRequest, serverError } from '@/lib/api-helpers'
import { createServerClient } from '@supabase/ssr'
import { rateLimitByIp } from '@/lib/rate-limit-ip'

export async function POST(req: NextRequest) {
  try {
    const { success } = await rateLimitByIp(req)
    if (!success) {
      return NextResponse.json({ error: 'Demasiadas peticiones' }, { status: 429 })
    }

    const user = await getAuthenticatedUser(req)
    if (!user) return unauthorized()

    const body = await req.json()
    const { gestorUserId, perfilId } = body as { gestorUserId?: string; perfilId?: string }

    if (!gestorUserId || !perfilId) {
      return badRequest(new Error('gestorUserId y perfilId requeridos'))
    }

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

    // Verify the profile belongs to the current user
    const { data: perfil } = await supabase
      .from('perfiles')
      .select('id')
      .eq('id', perfilId)
      .eq('userId', user.id)
      .single()

    if (!perfil) {
      return badRequest(new Error('No puedes revocar acceso de un perfil que no es tuyo.'))
    }

    // Delete the association where the gestor was managing this profile.
    // RLS permite al dueño del perfil borrar filas apuntando a su perfil.
    const { data: borradas, error } = await supabase
      .from('perfil_asociado')
      .delete()
      .eq('ownerUserId', gestorUserId)
      .eq('perfilId', perfilId)
      .select('id')

    if (error) {
      console.error('Error revoking access:', error)
      return serverError(new Error('No se pudo revocar el acceso'))
    }

    if (!borradas || borradas.length === 0) {
      return badRequest(new Error('No se encontró la asociación a revocar.'))
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    return serverError(error)
  }
}
