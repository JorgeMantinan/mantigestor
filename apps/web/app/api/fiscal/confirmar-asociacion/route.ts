import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createAdminClient } from '@/lib/supabase/admin'
import { rateLimitByIp } from '@/lib/rate-limit-ip'
import crypto from 'crypto'

// GET: obtener info del invitador (sin auth requirement)
// Usa service_role porque la invitación puede consultarse sin sesión
export async function GET(req: NextRequest) {
  try {
    const { success } = await rateLimitByIp(req, { maxRequests: 10, windowMs: 60 * 1000 })
    if (!success) {
      return NextResponse.json({ error: 'Demasiadas peticiones. Intenta de nuevo en un minuto.' }, { status: 429 })
    }

    const { searchParams } = new URL(req.url)
    const invitacionId = searchParams.get('invitacion')
    const email = searchParams.get('email')

    if (!invitacionId || !email) {
      return NextResponse.json({ error: 'Parámetros inválidos' }, { status: 400 })
    }

    const admin = createAdminClient()

    const { data: invitacion } = await admin
      .from('invitaciones_pendientes')
      .select('invitadoPorUserId, aceptada')
      .eq('id', invitacionId)
      .eq('email', email)
      .eq('tipo', 'gestion')
      .maybeSingle()

    if (!invitacion) {
      return NextResponse.json({ error: 'Invitación no encontrada' }, { status: 404 })
    }

    const { data: invitadorPerfil } = await admin
      .from('perfiles')
      .select('email, nombre')
      .eq('userId', invitacion.invitadoPorUserId)
      .maybeSingle()

    return NextResponse.json({
      ok: true,
      invitadorEmail: invitadorPerfil?.email ?? '',
      invitadorNombre: invitadorPerfil?.nombre ?? '',
      aceptada: invitacion.aceptada,
    })
  } catch (error) {
    console.error('Error fetching invitation info:', error)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}

// POST: confirmar asociación (requires auth)
export async function POST(req: NextRequest) {
  try {
    const { success } = await rateLimitByIp(req, { maxRequests: 5, windowMs: 60 * 1000 })
    if (!success) {
      return NextResponse.json(
        { error: 'Demasiadas peticiones. Intenta de nuevo en un minuto.' },
        { status: 429 }
      )
    }

    const body = await req.json()
    const { invitacionId, email } = body as { invitacionId?: string; email?: string }

    if (!invitacionId || !email) {
      return NextResponse.json({ error: 'Parámetros inválidos' }, { status: 400 })
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

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Debes iniciar sesión para confirmar' }, { status: 401 })
    }

    if (user.email !== email) {
      return NextResponse.json({ error: `Esta invitación es para ${email}, no para ${user.email}` }, { status: 403 })
    }

    const { data: invitacion, error: invError } = await supabase
      .from('invitaciones_pendientes')
      .select('id, invitadoPorUserId, aceptada, rol')
      .eq('id', invitacionId)
      .eq('email', email)
      .eq('tipo', 'gestion')
      .maybeSingle()

    if (invError || !invitacion) {
      return NextResponse.json({ error: 'Invitación no encontrada' }, { status: 404 })
    }

    if (invitacion.aceptada) {
      return NextResponse.json({ error: 'Esta invitación ya fue aceptada' }, { status: 400 })
    }

    const { data: miPerfil } = await supabase
      .from('perfiles')
      .select('id')
      .eq('userId', user.id)
      .maybeSingle()

    if (!miPerfil) {
      return NextResponse.json({ error: 'No se encontró tu perfil.' }, { status: 404 })
    }

    // Verificar que no exista ya la asociación
    const { data: yaAsociado } = await supabase
      .from('perfil_asociado')
      .select('id')
      .eq('ownerUserId', invitacion.invitadoPorUserId)
      .eq('perfilId', miPerfil.id)
      .maybeSingle()

    if (!yaAsociado) {
      const { error: fnError } = await supabase.rpc('crear_asociacion_segura', {
        p_owner_user_id: invitacion.invitadoPorUserId,
        p_perfil_id: miPerfil.id,
        p_rol: invitacion.rol ?? 'gestor',
      })

      if (fnError) {
        console.error('Error creating association via RPC:', JSON.stringify(fnError))
        const { error: asocError } = await supabase
          .from('perfil_asociado')
          .insert({
            id: crypto.randomUUID(),
            ownerUserId: invitacion.invitadoPorUserId,
            perfilId: miPerfil.id,
            rol: invitacion.rol ?? 'gestor',
          })

        if (asocError) {
          console.error('Fallback insert also failed:', JSON.stringify(asocError))
          return NextResponse.json({ error: 'Error al crear la asociación.' }, { status: 500 })
        }
      }
    }

    await supabase
      .from('invitaciones_pendientes')
      .update({ aceptada: true })
      .eq('id', invitacionId)

    const { data: invitadorPerfil } = await supabase
      .from('perfiles')
      .select('email, nombre')
      .eq('userId', invitacion.invitadoPorUserId)
      .maybeSingle()

    return NextResponse.json({
      ok: true,
      invitadorEmail: invitadorPerfil?.email ?? '',
      invitadorNombre: invitadorPerfil?.nombre ?? '',
    })
  } catch (error) {
    console.error('Error in confirmar-asociacion:', error)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}
