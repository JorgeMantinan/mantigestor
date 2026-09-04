import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser, unauthorized, badRequest, serverError } from '@/lib/api-helpers'
import { createClient } from '@supabase/supabase-js'
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

    // Usar service role key para bypass RLS (creamos perfil para OTRO usuario)
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Buscar si el email ya tiene un perfil
    const { data: perfilExistente } = await supabaseAdmin
      .from('perfiles')
      .select('id, userId')
      .eq('email', email)
      .single()

    let perfilId: string

    if (perfilExistente) {
      return badRequest(new Error('Este email ya tiene un perfil registrado. Debe registrarse primero en la app para poder asociarlo.'))
    }

    // Crear perfil temporal sin userId (será completado cuando el usuario se registre)
    perfilId = crypto.randomUUID()
    const { error: insertError } = await supabaseAdmin
      .from('perfiles')
      .insert({
        id: perfilId,
        userId: `pending:${email}`,
        email,
        nombre: nombre ?? null,
        nif: nif ?? null,
      })

    if (insertError) {
      console.error('Error creating profile:', insertError)
      return serverError(new Error('No se pudo crear el perfil'))
    }

    // Crear asociación
    const { error: asocError } = await supabaseAdmin
      .from('perfil_asociado')
      .insert({
        id: crypto.randomUUID(),
        ownerUserId: user.id,
        perfilId,
        rol: 'gestor',
      })

    if (asocError) {
      console.error('Error creating association:', asocError)
      return serverError(new Error('No se pudo crear la asociación'))
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
