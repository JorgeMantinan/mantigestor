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

    // Verificar que el email no esté ya registrado
    const { data: perfilExistente } = await supabase
      .from('perfiles')
      .select('id')
      .eq('email', email)
      .maybeSingle()

    if (perfilExistente) {
      return badRequest(new Error('Este email ya tiene un perfil registrado. Asócialo directamente desde Ajustes → Personas.'))
    }

    // Verificar que no haya ya una invitación pendiente para este email
    const { data: invitacionExistente } = await supabase
      .from('invitaciones_pendientes')
      .select('id')
      .eq('email', email)
      .eq('invitadoPorUserId', user.id)
      .eq('aceptada', false)
      .maybeSingle()

    if (invitacionExistente) {
      return badRequest(new Error('Ya existe una invitación pendiente para este email. Espera a que la acepte o reenvía el email.'))
    }

    // Crear invitación pendiente (sin crear perfil)
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
      return serverError(new Error('No se pudo crear la invitación. Ejecuta la migración SQL en Supabase.'))
    }

    // Enviar email de invitación
    if (!process.env.RESEND_API_KEY) {
      console.log('RESEND_API_KEY not set — email skipped. Invitation ID:', invitacionId)
    } else {
      try {
        const { Resend } = await import('resend')
        const resend = new Resend(process.env.RESEND_API_KEY)
        const emailEncoded = encodeURIComponent(email)

        const emailResult = await resend.emails.send({
          from: process.env.EMAIL_FROM || 'MantiGestor <onboarding@resend.dev>',
          to: email,
          subject: `${user.email} te invita a MantiGestor`,
          html: `
            <div style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto;padding:20px">
              <h2 style="color:#1a1a1a;margin-bottom:8px">Invitación de MantiGestor</h2>
              <p>Hola${nombre ? ` ${nombre}` : ''},</p>
              <p><strong>${user.email}</strong> te ha invitado a gestionar tus datos fiscales en MantiGestor.</p>
              <p>Al aceptar, podrá ver y gestionar tus facturas, trimestres y otros documentos fiscales en tu nombre.</p>
              <div style="margin:24px 0">
                <a href="https://mantigestor.vercel.app/register?invitacion=${invitacionId}&email=${emailEncoded}" style="display:inline-block;background:#eab308;color:#000;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold">
                  Aceptar invitación y registrarme
                </a>
              </div>
              <p style="color:#666;font-size:14px">
                Si no conoces a ${user.email} o no deseas ser gestionado por esta persona, puedes ignorar este email.
              </p>
              <p style="color:#999;font-size:12px;margin-top:24px">
                Email automático de MantiGestor. No respondas a este mensaje.
              </p>
            </div>
          `,
        })

        console.log('Invitation email sent to:', email, 'Result:', JSON.stringify(emailResult))
      } catch (emailError) {
        console.error('Error sending invitation email:', JSON.stringify(emailError))
      }
    }

    return NextResponse.json({ ok: true, invitacionId })
  } catch (error) {
    return serverError(error)
  }
}
