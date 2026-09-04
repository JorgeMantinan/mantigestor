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

    // Buscar perfil existente por email
    const { data: perfilExistente } = await supabase
      .from('perfiles')
      .select('id')
      .eq('email', email)
      .maybeSingle()

    // CASO 1: El usuario ya tiene perfil → asociar directamente
    if (perfilExistente) {
      // Verificar que no esté ya asociado
      const { data: yaAsociado } = await supabase
        .from('perfil_asociado')
        .select('id')
        .eq('ownerUserId', user.id)
        .eq('perfilId', perfilExistente.id)
        .maybeSingle()

      if (yaAsociado) {
        return badRequest(new Error('Esta persona ya está asociada a tu cuenta.'))
      }

      // Crear asociación gestor → perfil
      const { error: asocError } = await supabase
        .from('perfil_asociado')
        .insert({
          id: crypto.randomUUID(),
          ownerUserId: user.id,
          perfilId: perfilExistente.id,
          rol: 'gestor',
        })

      if (asocError) {
        console.error('Error creating association:', JSON.stringify(asocError))
        return serverError(new Error('No se pudo crear la asociación: ' + asocError.message))
      }

      return NextResponse.json({
        ok: true,
        linked: true,
        perfilId: perfilExistente.id,
        message: `${email} ya tiene cuenta. Asociado directamente.`,
      })
    }

    // CASO 2: No tiene perfil → crear invitación
    const { data: invitacionExistente } = await supabase
      .from('invitaciones_pendientes')
      .select('id')
      .eq('email', email)
      .eq('invitadoPorUserId', user.id)
      .eq('aceptada', false)
      .maybeSingle()

    if (invitacionExistente) {
      return badRequest(new Error('Ya existe una invitación pendiente para este email. Espera a que la acepte.'))
    }

    const invitacionId = crypto.randomUUID()
    const now = new Date().toISOString()
    const { error: insertError } = await supabase
      .from('invitaciones_pendientes')
      .insert({
        id: invitacionId,
        email,
        nombre: nombre ?? null,
        nif: nif ?? null,
        invitadoPorUserId: user.id,
        invitadoPorEmail: user.email ?? '',
        aceptada: false,
        createdAt: now,
      })

    if (insertError) {
      console.error('Error creating invitation:', JSON.stringify(insertError))
      return serverError(new Error('No se pudo crear la invitación.'))
    }

    const invitacionLink = `https://mantigestor.vercel.app/register?invitacion=${invitacionId}&email=${encodeURIComponent(email)}`
    let emailSent = false

    if (!process.env.RESEND_API_KEY) {
      console.log('RESEND_API_KEY not set — email skipped. Link:', invitacionLink)
    } else {
      try {
        const { Resend } = await import('resend')
        const resend = new Resend(process.env.RESEND_API_KEY)

        const emailResult = await resend.emails.send({
          from: 'MantiGestor <onboarding@resend.dev>',
          to: email,
          subject: `${user.email} te invita a MantiGestor`,
          html: `
            <div style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto;padding:20px">
              <h2 style="color:#1a1a1a;margin-bottom:8px">Invitación de MantiGestor</h2>
              <p>Hola${nombre ? ` ${nombre}` : ''},</p>
              <p><strong>${user.email}</strong> te ha invitado a gestionar tus datos fiscales en MantiGestor.</p>
              <p>Al aceptar, podrá ver y gestionar tus facturas, trimestres y otros documentos fiscales en tu nombre.</p>
              <div style="margin:24px 0">
                <a href="${invitacionLink}" style="display:inline-block;background:#eab308;color:#000;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold">
                  Aceptar invitación y registrarme
                </a>
              </div>
              <p style="color:#666;font-size:14px">
                Si no conoces a ${user.email} o no deseas ser gestionado por esta persona, puedes ignorar este email.
              </p>
            </div>
          `,
        })

        if (emailResult.error) {
          console.error('Resend error:', JSON.stringify(emailResult.error))
        } else {
          emailSent = true
        }
      } catch (emailError) {
        console.error('Error sending invitation email:', JSON.stringify(emailError))
      }
    }

    return NextResponse.json({ ok: true, invitacionId, invitacionLink, emailSent })
  } catch (error) {
    return serverError(error)
  }
}
