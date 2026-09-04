import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser, unauthorized, badRequest, serverError } from '@/lib/api-helpers'
import { createServerClient } from '@supabase/ssr'

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req)
    if (!user) return unauthorized()

    const body = await req.json()
    const { email, nombre, nif } = body as { email?: string; nombre?: string; nif?: string }

    if (!email || !email.includes('@') || !email.includes('.')) {
      return badRequest(new Error('Email inválido'))
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

    // Buscar si el email ya tiene un perfil
    const { data: perfilExistente } = await supabase
      .from('perfiles')
      .select('id, userId')
      .eq('email', email)
      .maybeSingle()

    if (perfilExistente) {
      return badRequest(new Error('Este email ya tiene un perfil registrado. Debe registrarse primero en la app para poder asociarlo.'))
    }

    // Usar función SQL con SECURITY DEFINER para bypassear RLS
    // Esta función debe crearse en Supabase SQL Editor (ver migration.sql)
    const { data: perfilData, error: fnError } = await supabase
      .rpc('crear_perfil_pendiente', {
        p_email: email,
        p_nombre: nombre ?? null,
        p_nif: nif ?? null,
      })

    if (fnError) {
      console.error('Error calling crear_perfil_pendiente:', fnError.message, fnError.code)

      // Fallback: intentar insertar directamente (funciona si el usuario ya existe en auth)
      const perfilId = crypto.randomUUID()
      const now = new Date().toISOString()
      const { error: insertError } = await supabase
        .from('perfiles')
        .insert({
          id: perfilId,
          userId: user.id, // Temporal: usa el userId del propietario
          email,
          nombre: nombre ?? null,
          nif: nif ?? null,
          createdAt: now,
          updatedAt: now,
        })

      if (insertError) {
        console.error('Fallback insert also failed:', insertError.message, insertError.code)
        return serverError(new Error('No se pudo crear el perfil. Ejecuta la migración SQL en Supabase.'))
      }

      // Actualizar al pending
      await supabase
        .from('perfiles')
        .update({ userId: `pending:${email}` })
        .eq('id', perfilId)

      // Crear asociación
      const { error: asocError } = await supabase
        .from('perfil_asociado')
        .insert({
          id: crypto.randomUUID(),
          ownerUserId: user.id,
          perfilId,
          rol: 'gestor',
        })

      if (asocError) {
        console.error('Error creating association:', asocError.message)
        return serverError(new Error('No se pudo crear la asociación'))
      }

      return NextResponse.json({ ok: true, perfilId })
    }

    // La función SQL devolvió el perfilId
    const perfilId = perfilData as string

    // Crear asociación
    const { error: asocError } = await supabase
      .from('perfil_asociado')
      .insert({
        id: crypto.randomUUID(),
        ownerUserId: user.id,
        perfilId,
        rol: 'gestor',
      })

    if (asocError) {
      console.error('Error creating association:', asocError.message, asocError.code)
      return serverError(new Error('No se pudo crear la asociación: ' + asocError.message))
    }

    // Enviar email de invitación (no bloqueante)
    if (process.env.RESEND_API_KEY) {
      try {
        const { Resend } = await import('resend')
        const resend = new Resend(process.env.RESEND_API_KEY)
        const emailEncoded = encodeURIComponent(email)

        await resend.emails.send({
          from: process.env.EMAIL_FROM || 'MantiGestor <onboarding@resend.dev>',
          to: email,
          subject: 'MantiGestor — Has sido añadido como gestor',
          html: `
            <div style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto;padding:20px">
              <h2 style="color:#1a1a1a;margin-bottom:8px">Invitación de MantiGestor</h2>
              <p>Hola${nombre ? ` ${nombre}` : ''},</p>
              <p><strong>${user.email}</strong> te ha añadido como persona gestionada en su cuenta de MantiGestor.</p>
              <p>Para aceptar la invitación y comenzar a utilizar la plataforma, completa tu registro:</p>
              <a href="https://mantigestor.vercel.app/register?invitado=true&email=${emailEncoded}" style="display:inline-block;background:#eab308;color:#000;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:bold;margin-top:8px">
                Aceptar invitación
              </a>
              <p style="color:#999;font-size:12px;margin-top:24px">
                Email automático de MantiGestor. Si no esperabas esta invitación, puedes ignorar este mensaje.
              </p>
            </div>
          `,
        })
      } catch (emailError) {
        console.error('Error sending invitation email:', emailError)
      }
    }

    return NextResponse.json({ ok: true, perfilId })
  } catch (error) {
    return serverError(error)
  }
}
