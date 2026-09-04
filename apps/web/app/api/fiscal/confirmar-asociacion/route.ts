import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import crypto from 'crypto'

export async function POST(req: NextRequest) {
  try {
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

    // Verificar usuario autenticado
    const { data: { user } } = await (supabase.auth as any).getUser()
    if (!user) {
      return NextResponse.json({ error: 'Debes iniciar sesión para confirmar' }, { status: 401 })
    }

    if (user.email !== email) {
      return NextResponse.json({ error: `Esta invitación es para ${email}, no para ${user.email}` }, { status: 403 })
    }

    // Buscar la invitación
    const { data: invitacion, error: invError } = await supabase
      .from('invitaciones_pendientes')
      .select('id, invitadoPorUserId, aceptada')
      .eq('id', invitacionId)
      .eq('email', email)
      .maybeSingle()

    if (invError || !invitacion) {
      return NextResponse.json({ error: 'Invitación no encontrada' }, { status: 404 })
    }

    if (invitacion.aceptada) {
      return NextResponse.json({ error: 'Esta invitación ya fue aceptada' }, { status: 400 })
    }

    // Verificar que el usuario tenga perfil
    const { data: miPerfil } = await supabase
      .from('perfiles')
      .select('id')
      .eq('userId', user.id)
      .maybeSingle()

    if (!miPerfil) {
      return NextResponse.json({ error: 'No se encontró tu perfil. Actualiza la página.' }, { status: 404 })
    }

    // Verificar que no exista ya la asociación
    const { data: yaAsociado } = await supabase
      .from('perfil_asociado')
      .select('id')
      .eq('ownerUserId', invitacion.invitadoPorUserId)
      .eq('perfilId', miPerfil.id)
      .maybeSingle()

    if (!yaAsociado) {
      // Usar función SQL con SECURITY DEFINER para bypassear RLS
      const { error: fnError } = await supabase.rpc('crear_asociacion_segura', {
        p_owner_user_id: invitacion.invitadoPorUserId,
        p_perfil_id: miPerfil.id,
        p_rol: 'gestor',
      })

      if (fnError) {
        console.error('Error creating association via RPC:', JSON.stringify(fnError))
        // Fallback: intentar insert directo
        const { error: asocError } = await supabase
          .from('perfil_asociado')
          .insert({
            id: crypto.randomUUID(),
            ownerUserId: invitacion.invitadoPorUserId,
            perfilId: miPerfil.id,
            rol: 'gestor',
          })

        if (asocError) {
          console.error('Fallback insert also failed:', JSON.stringify(asocError))
          return NextResponse.json({ error: 'Error al crear la asociación. Verifica los permisos RLS.' }, { status: 500 })
        }
      }
    }

    // Marcar invitación como aceptada
    await supabase
      .from('invitaciones_pendientes')
      .update({ aceptada: true })
      .eq('id', invitacionId)

    // Obtener email del invitador
    const { data: invitadorPerfil } = await supabase
      .from('perfiles')
      .select('email')
      .eq('userId', invitacion.invitadoPorUserId)
      .maybeSingle()

    return NextResponse.json({
      ok: true,
      invitadorEmail: invitadorPerfil?.email ?? '',
    })
  } catch (error) {
    console.error('Error in confirmar-asociacion:', error)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}
