import { NextResponse, type NextRequest } from 'next/server'
import { getAuthenticatedUser, unauthorized, badRequest, serverError } from '@/lib/api-helpers'
import { rateLimitByIp } from '@/lib/rate-limit-ip'

export const maxDuration = 120

interface EmailAttachment {
  filename: string
  contentType: string
  size: number
  data: string
}

interface ImportedInvoice {
  filename: string
  subject: string
  from: string
  date: string
  text?: string
  attachments: EmailAttachment[]
}

export async function POST(req: NextRequest) {
  try {
    const { success } = await rateLimitByIp(req, { maxRequests: 10, windowMs: 60_000 })
    if (!success) {
      return NextResponse.json(
        { error: 'Demasiadas peticiones. Intenta de nuevo en un minuto.' },
        { status: 429 }
      )
    }

    const user = await getAuthenticatedUser(req)
    if (!user) return unauthorized()

    const body: unknown = await req.json()
    if (
      !body ||
      typeof body !== 'object' ||
      !('email' in body) ||
      !('password' in body) ||
      !('server' in body) ||
      !('port' in body)
    ) {
      return badRequest(new Error('Faltan campos requeridos: email, password, server, port'))
    }

    const { email, password, server, port } = body as {
      email: string
      password: string
      server: string
      port: number
    }

    if (!email || !password || !server || !port) {
      return badRequest(new Error('email, password, server y port son requeridos'))
    }

    const { ImapFlow } = await import('imapflow')
    const { simpleParser } = await import('mailparser')

    const imap = new ImapFlow({
      host: server,
      port,
      secure: port === 993,
      auth: { user: email, pass: password },
      logger: false,
      tls: { rejectUnauthorized: false },
    })

    await imap.connect()

    const lock = await imap.getMailboxLock('INBOX')
    try {
      const sinceDate = new Date()
      sinceDate.setDate(sinceDate.getDate() - 30)

      const uids = await imap.search({ since: sinceDate })
      if (!uids || uids.length === 0) {
        return Response.json({ facturas: [], total: 0 })
      }

      const imported: ImportedInvoice[] = []
      const LIMIT = 50
      const uidsToFetch = uids.slice(-LIMIT)

      for (const uid of uidsToFetch) {
        const msg = await imap.fetchOne(uid, { source: true }, { uid: true })
        if (!msg?.source) continue

        const parsed = await simpleParser(msg.source)
        const pdfAttachments: EmailAttachment[] = []

        for (const attachment of parsed.attachments ?? []) {
          if (
            attachment.contentType === 'application/pdf' ||
            attachment.filename?.toLowerCase().endsWith('.pdf')
          ) {
            pdfAttachments.push({
              filename: attachment.filename ?? 'factura.pdf',
              contentType: attachment.contentType,
              size: attachment.size,
              data: attachment.content.toString('base64'),
            })
          }
        }

        if (pdfAttachments.length > 0) {
          imported.push({
            filename: pdfAttachments[0]!.filename,
            subject: parsed.subject ?? '(sin asunto)',
            from: typeof parsed.from === 'object' && parsed.from?.text
              ? parsed.from.text
              : String(parsed.from ?? ''),
            date: parsed.date?.toISOString() ?? new Date().toISOString(),
            text: parsed.text ?? undefined,
            attachments: pdfAttachments,
          })
        }
      }

      return Response.json({
        facturas: imported,
        total: imported.length,
        scanned: uidsToFetch.length,
      })
    } finally {
      lock.release()
      await imap.logout()
    }
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Error desconocido'
    if (message.includes('auth') || message.includes('LOGIN')) {
      return NextResponse.json(
        { error: 'Credenciales de email incorrectas' },
        { status: 401 }
      )
    }
    if (message.includes('connect') || message.includes('ECONNREFUSED')) {
      return NextResponse.json(
        { error: 'No se pudo conectar al servidor de correo' },
        { status: 502 }
      )
    }
    return serverError(error)
  }
}
