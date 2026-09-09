import { NextResponse, type NextRequest } from 'next/server'
import { getAuthenticatedUser, getSupabaseServer, unauthorized, badRequest, serverError } from '@/lib/api-helpers'
import { rateLimitByIp } from '@/lib/rate-limit-ip'
import { resolvePerfilActivo } from '@/lib/resolve-perfil-activo'

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

    const { facturaId, email, htmlBody, pdfBase64, numero, empresaNombre, asunto, cuerpo } = await req.json()

    if (!facturaId || !email) {
      return badRequest('Faltan campos requeridos')
    }

    const supabase = await getSupabaseServer(req)
    const { data: factura } = await supabase
      .from('facturas')
      .select('id, perfilId')
      .eq('id', facturaId)
      .single()

    if (!factura || factura.perfilId !== perfilId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    if (!email.includes('@') || !email.includes('.')) {
      return badRequest('Dirección de email no válida')
    }

    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json({ ok: true, skipped: true, message: 'Email no enviado: falta RESEND_API_KEY' })
    }

    const { Resend } = await import('resend')
    const resend = new Resend(process.env.RESEND_API_KEY)

    const attachments = []
    if (pdfBase64) {
      attachments.push({
        filename: `factura-${numero}.pdf`,
        content: pdfBase64,
      })
    }

    const subject = asunto || `Factura ${numero} de ${empresaNombre}`
    const html = cuerpo
      ? `<div style="font-family:system-ui,-apple-system,sans-serif;color:#1a1a1a;max-width:600px;margin:0 auto;padding:20px"><pre style="white-space:pre-wrap;font-family:inherit;font-size:14px;line-height:1.6">${cuerpo.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre></div>`
      : htmlBody

    await resend.emails.send({
      from: process.env.EMAIL_FROM || 'MantiGestor <onboarding@resend.dev>',
      to: email,
      subject,
      html,
      attachments,
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    return serverError(error)
  }
}
