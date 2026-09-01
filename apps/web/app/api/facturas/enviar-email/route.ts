import { NextResponse, type NextRequest } from 'next/server'
import { getAuthenticatedUser, unauthorized, badRequest, serverError } from '@/lib/api-helpers'
import { rateLimitByIp } from '@/lib/rate-limit-ip'

export async function POST(req: NextRequest) {
  try {
    const { success } = rateLimitByIp(req, { maxRequests: 5, windowMs: 60 * 1000 })
    if (!success) {
      return NextResponse.json(
        { error: 'Demasiadas peticiones. Intenta de nuevo en un minuto.' },
        { status: 429 }
      )
    }

    const user = await getAuthenticatedUser(req)
    if (!user) return unauthorized()

    const { facturaId, email, htmlBody, pdfBase64, numero, empresaNombre } = await req.json()

    if (!facturaId || !email) {
      return badRequest('Faltan campos requeridos')
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

    await resend.emails.send({
      from: process.env.EMAIL_FROM || 'MantiGestor <onboarding@resend.dev>',
      to: email,
      subject: `Factura ${numero} de ${empresaNombre}`,
      html: htmlBody,
      attachments,
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    return serverError(error)
  }
}
