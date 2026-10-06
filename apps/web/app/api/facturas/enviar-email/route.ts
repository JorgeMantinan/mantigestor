import { NextResponse, type NextRequest } from 'next/server'
import { getAuthenticatedUser, getSupabaseServer, unauthorized, badRequest, serverError } from '@/lib/api-helpers'
import { rateLimitByIp } from '@/lib/rate-limit-ip'
import { resolvePerfilActivo, esSoloLectura } from '@/lib/resolve-perfil-activo'
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

    const { perfilId, rol } = await resolvePerfilActivo(req)
    // Escritura bloqueada para perfiles en modo solo lectura (visualizador)
    if (esSoloLectura(rol)) {
      return NextResponse.json({ error: 'El perfil está en modo solo lectura' }, { status: 403 })
    }

    // El HTML se construye SIEMPRE en servidor con los datos de la factura
    // (antes se aceptaba htmlBody arbitrario del cliente → phishing desde
    // el dominio de envío). Solo se acepta un cuerpo de texto plano.
    const { facturaId, email, pdfBase64, numero, empresaNombre, asunto, cuerpo } = await req.json()

    if (!facturaId || !email) {
      return badRequest('Faltan campos requeridos')
    }

    if (typeof email !== 'string' || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return badRequest('Dirección de email no válida')
    }

    const supabase = await getSupabaseServer(req)
    const { data: factura } = await supabase
      .from('facturas')
      .select('id, perfilId, numero, emisorReceptor, fechaEmision, baseImponible, iva, total')
      .eq('id', facturaId)
      .single()

    if (!factura || factura.perfilId !== perfilId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json({ ok: true, skipped: true, message: 'Email no enviado: falta RESEND_API_KEY' })
    }

    const { Resend } = await import('resend')
    const resend = new Resend(process.env.RESEND_API_KEY)

    const attachments = []
    if (pdfBase64) {
      if (typeof pdfBase64 !== 'string' || pdfBase64.length > 14_000_000) {
        return badRequest('PDF demasiado grande')
      }
      attachments.push({
        filename: `factura-${factura.numero ?? numero ?? ''}.pdf`,
        content: pdfBase64,
      })
    }

    const asuntoLimpio = String(asunto || `Factura ${factura.numero ?? numero ?? ''} de ${factura.emisorReceptor ?? empresaNombre ?? ''}`)
      .replace(/[\r\n]+/g, ' ')
      .slice(0, 200)
    const cuerpoTexto = typeof cuerpo === 'string' ? cuerpo.trim().slice(0, 5000) : ''
    const nFactura = escapeHtml(String(factura.numero ?? numero ?? ''))
    const emisor = escapeHtml(String(factura.emisorReceptor ?? empresaNombre ?? ''))
    const fecha = escapeHtml(String(factura.fechaEmision ?? ''))
    const totalEuros = typeof factura.total === 'number' ? (factura.total / 100).toFixed(2) : ''

    const html = `<!DOCTYPE html><html><body style="font-family:system-ui,-apple-system,sans-serif;color:#1a1a1a;background:#f7f7f8;padding:24px;margin:0">
<div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;padding:24px;border:1px solid #e5e5e5">
<h2 style="margin:0 0 12px;font-size:18px">Factura ${nFactura} — ${emisor}</h2>
${fecha ? `<p style="margin:4px 0;color:#555;font-size:14px">Fecha de emisión: ${fecha}</p>` : ''}
${totalEuros ? `<p style="margin:8px 0;font-size:16px"><strong>Total: ${totalEuros} €</strong></p>` : ''}
${cuerpoTexto ? `<hr style="border:none;border-top:1px solid #e5e5e5;margin:16px 0"><pre style="white-space:pre-wrap;font-family:inherit;font-size:14px;line-height:1.6;margin:0">${escapeHtml(cuerpoTexto)}</pre>` : ''}
<p style="margin:20px 0 0;font-size:12px;color:#888">Enviado desde MantiGestor</p>
</div></body></html>`

    const { error: sendError } = await resend.emails.send({
      from: process.env.EMAIL_FROM || 'MantiGestor <onboarding@resend.dev>',
      to: email,
      subject: asuntoLimpio,
      html,
      attachments,
    })

    if (sendError) {
      console.error('[enviar-email] Resend error:', sendError)
      return NextResponse.json({ error: 'No se pudo enviar el email' }, { status: 502 })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    return serverError(error)
  }
}
