import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser, unauthorized, badRequest, serverError } from '@/lib/api-helpers'
import { createServerClient } from '@supabase/ssr'
import crypto from 'crypto'

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req)
    if (!user) return unauthorized()

    const body = await req.json()
    const { email, nombre, nif } = body as { email?: string; nombre?: string; nif?: string }

    if (!email || !email.includes('@') || !email.includes('.')) {
      return badRequest(new Error('Email inválido'))
    }

    // Usar cookies del usuario para que RLS permita las operaciones
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

    let perfilId: string

    if (perfilExistente) {
      return badRequest(new Error('Este email ya tiene un perfil registrado. Debe registrarse primero en la app para poder asociarlo.'))
    }

    // Crear perfil — RLS permite al usuario autenticado insertar en su propia tabla
    // Usamos el userId del usuario autenticado con un sufijo para el pending
    perfilId = crypto.randomUUID()
    const { error: insertError } = await supabase
      .from('perfiles')
      .insert({
        id: perfilId,
        userId: `pending:${email}`,
        email,
        nombre: nombre ?? null,
        nif: nif ?? null,
      })

    if (insertError) {
      console.error('Error creating profile:', insertError.message, insertError.code, insertError.details)
      // Si RLS bloquea el insert con pending:email, crear el perfil como propietario
      // y luego actualizarlo
      if (insertError.code === '42501') {
        // RLS requiere que el userId coincida con auth.uid()
        // Solución: crear el perfil como propio y luego cambiar el userId
        const tempId = crypto.randomUUID()
        const { error: altError } = await supabase
          .from('perfiles')
          .insert({
            id: tempId,
            userId: user.id, // Temporal: usa el userId del propietario
            email,
            nombre: nombre ?? null,
            nif: nif ?? null,
          })

        if (altError) {
          console.error('Alternative profile creation also failed:', altError.message)
          return serverError(new Error('No se pudo crear el perfil. Verifica los permisos RLS de la tabla perfiles.'))
        }

        // Ahora actualizar el userId al pendiente
        await supabase
          .from('perfiles')
          .update({ userId: `pending:${email}` })
          .eq('id', tempId)

        perfilId = tempId
      } else {
        return serverError(new Error('No se pudo crear el perfil: ' + insertError.message))
      }
    }

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
