import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser, unauthorized, badRequest, serverError } from '@/lib/api-helpers'
import { createServerClient } from '@supabase/ssr'
import { createAdminClient } from '@/lib/supabase/admin'
import { rateLimitByIp } from '@/lib/rate-limit-ip'
import { escapeHtml } from '@/lib/escape-html'
import crypto from 'crypto'
import { z } from 'zod'

export async function POST(req: NextRequest) {
  try {
    const { success } = await rateLimitByIp(req, { maxRequests: 5, windowMs: 60 * 1000 })
    if (!success) {
      return NextResponse.json(
        { error: 'Demasiadas peticiones. Intenta de nuevo en un minuto.' },
        { status: 429 }
      )
    }

    const user = await getAuthenticatedUser(req)
    if (!user) return unauthorized()

    const BodySchema = z.object({
      email: z.string().email(),
      nombre: z.string().optional(),
      nif: z.string().optional(),
      rol: z.enum(['gestor', 'visualizador']).default('gestor'),
    })

    const parseResult = BodySchema.safeParse(await req.json())
    if (!parseResult.success) {
      return badRequest(new Error('Datos inválidos'))
    }
    const { email, nombre, nif, rol } = parseResult.data

    // No poder asociarse a sí mismo
    if (email === user.email) {
      return badRequest(new Error('No puedes asociarte a ti mismo.'))
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

    // Verificar si ya existe perfil para ese email → service_role (RLS bloquea perfiles ajenos)
    const { data: perfilExistente } = await createAdminClient()
      .from('perfiles')
      .select('id')
      .eq('email', email)
      .maybeSingle()

    if (perfilExistente) {
      const { data: yaAsociado } = await supabase
        .from('perfil_asociado')
        .select('id')
        .eq('ownerUserId', user.id)
        .eq('perfilId', perfilExistente.id)
        .maybeSingle()

      if (yaAsociado) {
        return badRequest(new Error('Esta persona ya está asociada a tu cuenta.'))
      }
    }

    // Verificar si ya hay una invitación pendiente para este email de este gestor
    const { data: invitacionExistente } = await supabase
      .from('invitaciones_pendientes')
      .select('id, aceptada')
      .eq('email', email)
      .eq('invitadoPorUserId', user.id)
      .maybeSingle()

    if (invitacionExistente && !invitacionExistente.aceptada) {
      return badRequest(new Error('Ya existe una invitación pendiente para este email. Espera a que la acepte.'))
    }

    // Crear invitación (tanto para usuarios nuevos como existentes)
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
        rol,
        tipo: 'gestion',
        createdAt: now,
      })

    if (insertError) {
      console.error('Error creating invitation:', JSON.stringify(insertError))
      return serverError(new Error('No se pudo crear la invitación.'))
    }

    // Link de confirmación (funciona para nuevos y existentes)
    const confirmacionLink = `https://mantigestor.vercel.app/confirmar-asociacion?invitacion=${invitacionId}&email=${encodeURIComponent(email)}`
    let emailSent = false

    if (!process.env.RESEND_API_KEY) {
      console.warn('RESEND_API_KEY not set — email skipped')
    } else {
      try {
        const { Resend } = await import('resend')
        const resend = new Resend(process.env.RESEND_API_KEY)

        const textoEmail = perfilExistente
          ? `<p><strong>${escapeHtml(user.email ?? '')}</strong> quiere gestionar tus datos fiscales en MantiGestor.</p>
             <p>Al aceptar, podrá ver y gestionar tus facturas, trimestres y otros documentos fiscales en tu nombre.</p>`
          : `<p><strong>${escapeHtml(user.email ?? '')}</strong> te ha invitado a gestionar tus datos fiscales en MantiGestor.</p>
             <p>Al aceptar, crearás tu cuenta y él/ella podrá gestionar tus asuntos fiscales en tu nombre.</p>`

        const botonTexto = perfilExistente ? 'Aceptar asociación' : 'Acepto y me registro'

        const emailResult = await resend.emails.send({
          from: 'MantiGestor <onboarding@resend.dev>',
          to: email,
          subject: `${escapeHtml(user.email ?? '')} quiere asociarse contigo en MantiGestor`,
          html: `
            <div style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto;padding:20px">
              <h2 style="color:#1a1a1a;margin-bottom:8px">Solicitud de asociación en MantiGestor</h2>
              <p>Hola${nombre ? ` ${escapeHtml(nombre)}` : ''},</p>
              ${textoEmail}
              <div style="margin:24px 0">
                <a href="${confirmacionLink}" style="display:inline-block;background:#eab308;color:#000;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold">
                  ${botonTexto}
                </a>
              </div>
              <p style="color:#666;font-size:14px">
                Si no conoces a ${escapeHtml(user.email ?? '')} o no deseas ser gestionado por esta persona, puedes ignorar este email.
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

    return NextResponse.json({
      ok: true,
      invitacionId,
      confirmacionLink,
      emailSent,
      mensaje: emailSent
        ? `Invitación enviada a ${email}. Espera a que confirme.`
        : `Invitación creada. Comparte este enlace con ${email} para que confirme.`,
    })
  } catch (error) {
    return serverError(error)
  }
}
