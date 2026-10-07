import { NextResponse, type NextRequest } from 'next/server'
import { getAuthenticatedUser, getSupabaseServer, unauthorized, badRequest, serverError } from '@/lib/api-helpers'
import { rateLimitByIp } from '@/lib/rate-limit-ip'
import { resolvePerfilActivo } from '@/lib/resolve-perfil-activo'
import { escapeHtml } from '@/lib/escape-html'

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

    const { perfilId } = await resolvePerfilActivo(req)

    // TODO derivado en servidor: antes el body traía destinatario, nombre y
    // contrapartes a voluntad → cualquier autenticado usaba la ruta como
    // email relay de spam desde el dominio de la plataforma (5/min).
    const supabase = await getSupabaseServer(req)
    const hoyDia = new Date().getDate()
    const [perfilRes, recRes] = await Promise.all([
      supabase.from('perfiles').select('email, nombre').eq('id', perfilId).maybeSingle(),
      supabase
        .from('facturas_recurrentes')
        .select('emisorReceptor')
        .eq('perfilId', perfilId)
        .eq('activa', true)
        .eq('diaEmail', hoyDia)
        .limit(200),
    ])

    const destinatario = perfilRes.data?.email
    if (!destinatario) return badRequest('El perfil no tiene email configurado')

    const contrapartes = [...new Set((recRes.data ?? []).map(r => String(r.emisorReceptor)).filter(Boolean))]
    if (contrapartes.length === 0) {
      return NextResponse.json({ ok: true, skipped: true })
    }

    const nombre = perfilRes.data?.nombre
    const ahora = new Date()
    const mes = ahora.getMonth() + 1
    const anyo = ahora.getFullYear()

    if (!process.env.RESEND_API_KEY) {
      // Sin API key: silencioso, no es error crítico
      return NextResponse.json({ ok: true, skipped: true })
    }

    const { Resend } = await import('resend')
    const resend = new Resend(process.env.RESEND_API_KEY)

    const nombreMes = new Date(anyo, mes - 1).toLocaleDateString('es-ES', { month: 'long' })
    const nombreSeguro = typeof nombre === 'string' && nombre.trim() ? escapeHtml(nombre.trim().slice(0, 100)) : ''
    const filasTabla = contrapartes
      .slice(0, 200)
      .map((c) =>
        `<tr><td style="padding:10px 14px;border-bottom:1px solid #e5e7eb;color:#374151;font-size:14px;">${escapeHtml(String(c)).slice(0, 200)}</td></tr>`
      )
      .join('')

    const { error: sendError } = await resend.emails.send({
      from: process.env.EMAIL_FROM || 'MantiGestor <onboarding@resend.dev>',
      to: destinatario,
      subject: `MantiGestor — Revisa tus facturas recurrentes de ${nombreMes}`,
      html: `
        <!DOCTYPE html>
        <html lang="es">
        <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
        <body style="margin:0;padding:0;background-color:#f9fafb;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;">
            <tr><td align="center" style="padding:32px 16px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;box-shadow:0 1px 3px rgba(0,0,0,0.08);overflow:hidden;">
                <!-- Header -->
                <tr>
                  <td style="background:#eab308;padding:24px 32px;text-align:center;">
                    <h1 style="margin:0;font-size:22px;font-weight:700;color:#1a1a1a;letter-spacing:-0.5px;">Manti<span style="color:#ffffff;">Gestor</span></h1>
                    <p style="margin:4px 0 0;font-size:13px;color:#422006;opacity:0.8;">Gestión fiscal inteligente</p>
                  </td>
                </tr>
                <!-- Body -->
                <tr>
                  <td style="padding:32px;">
                    <h2 style="margin:0 0 20px;font-size:20px;font-weight:600;color:#1a1a1a;">Facturas recurrentes de ${nombreMes}</h2>
                    <p style="margin:0 0 8px;font-size:15px;color:#374151;line-height:1.6;">Hola${nombreSeguro ? ` ${nombreSeguro}` : ''},</p>
                    <p style="margin:0 0 20px;font-size:15px;color:#374151;line-height:1.6;">Se han generado automáticamente las siguientes facturas recurrentes:</p>
                    <!-- Invoice table -->
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:8px;border-collapse:separate;overflow:hidden;margin-bottom:24px;">
                      <thead>
                        <tr>
                          <td style="background:#fefce8;padding:10px 14px;font-size:12px;font-weight:600;color:#854d0e;text-transform:uppercase;letter-spacing:0.5px;border-bottom:2px solid #eab308;">Contraparte</td>
                        </tr>
                      </thead>
                      <tbody>
                        ${filasTabla}
                      </tbody>
                    </table>
                    <!-- CTA -->
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                      <tr><td align="center">
                        <a href="https://mantigestor.vercel.app/gestoria/facturas" style="display:inline-block;background:#eab308;color:#1a1a1a;padding:12px 28px;border-radius:8px;text-decoration:none;font-size:15px;font-weight:600;letter-spacing:0.2px;">Ver facturas</a>
                      </td></tr>
                    </table>
                    <p style="margin:0;font-size:13px;color:#6b7280;line-height:1.5;">Puedes desactivar los recordatorios desde <a href="https://mantigestor.vercel.app/ajustes" style="color:#eab308;text-decoration:underline;">Ajustes</a>.</p>
                  </td>
                </tr>
                <!-- Footer -->
                <tr>
                  <td style="background:#f9fafb;padding:20px 32px;border-top:1px solid #e5e7eb;text-align:center;">
                    <p style="margin:0 0 4px;font-size:12px;color:#9ca3af;">MantiGestor &mdash; Gestión fiscal inteligente</p>
                    <p style="margin:0 0 4px;font-size:11px;color:#d1d5db;">Este es un email automático. No respondas a este mensaje.</p>
                    <p style="margin:0;font-size:11px;color:#d1d5db;"><a href="https://mantigestor.vercel.app/ajustes/notificaciones" style="color:#9ca3af;text-decoration:underline;">Gestionar notificaciones</a></p>
                  </td>
                </tr>
              </table>
            </td></tr>
          </table>
        </body>
        </html>
      `,
    })

    if (sendError) {
      console.error('[recurrentes/enviar-email] Resend error:', sendError)
      return NextResponse.json({ error: 'No se pudo enviar el email' }, { status: 502 })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    return serverError(error)
  }
}
