import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser, unauthorized, badRequest, serverError } from '@/lib/api-helpers'
import { createServerClient } from '@supabase/ssr'
import { rateLimitByIp } from '@/lib/rate-limit-ip'

export async function DELETE(req: NextRequest) {
  try {
    const { success } = await rateLimitByIp(req)
    if (!success) {
      return NextResponse.json({ error: 'Demasiadas peticiones' }, { status: 429 })
    }

    const user = await getAuthenticatedUser(req)
    if (!user) return unauthorized()

    const { searchParams } = new URL(req.url)
    const perfilId = searchParams.get('perfilId')
    if (!perfilId) return badRequest(new Error('perfilId requerido'))

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

    // Solo borrar si soy el propietario de la asociación
    const { error } = await supabase
      .from('perfil_asociado')
      .delete()
      .eq('ownerUserId', user.id)
      .eq('perfilId', perfilId)

    if (error) {
      console.error('Error deleting association:', error)
      return serverError(new Error('No se pudo eliminar la asociación'))
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    return serverError(error)
  }
}
