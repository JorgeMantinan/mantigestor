import { NextResponse, type NextRequest } from 'next/server'
import { getAuthenticatedUser, unauthorized, badRequest, serverError } from '@/lib/api-helpers'
import { rateLimitByIp } from '@/lib/rate-limit-ip'
import { lookup } from 'node:dns/promises'
import { isIP } from 'node:net'

export const maxDuration = 120

// Puertos IMAP habituales; todo lo demás se rechaza (SSRF)
const PUERTOS_IMAP_PERMITIDOS = new Set([143, 993])

function esIpPrivada(ip: string): boolean {
  if (ip.includes(':')) {
    const baja = ip.toLowerCase()
    if (baja === '::1' || baja === '::') return true
    if (/^fe[89ab]/.test(baja)) return true // link-local
    if (/^f[cd]/.test(baja)) return true // unique local fc00::/7
    const mapeada = baja.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/)
    if (mapeada?.[1]) return esIpPrivada(mapeada[1])
    return false
  }
  const partes = ip.split('.').map(Number)
  if (partes.length !== 4 || partes.some(isNaN)) return true
  const [a, b] = partes as [number, number, number, number]
  if (a === 0 || a === 10 || a === 127) return true
  if (a === 172 && b >= 16 && b <= 31) return true
  if (a === 192 && b === 168) return true
  if (a === 169 && b === 254) return true // metadata cloud (169.254.169.254)
  if (a === 100 && b >= 64 && b <= 127) return true // CGNAT
  return false
}

/** Devuelve el motivo de rechazo del host, o null si es seguro conectar. */
async function hostImapSeguro(host: string): Promise<string | null> {
  const h = host.trim().toLowerCase()
  if (!h || h.length > 253 || !/^[a-z0-9.\-:]+$/.test(h)) return 'Servidor de correo no válido'
  if (
    h === 'localhost' ||
    h.endsWith('.localhost') ||
    h.endsWith('.local') ||
    h.endsWith('.internal') ||
    h.endsWith('.home') ||
    h.endsWith('.lan')
  ) {
    return 'Servidor de correo no permitido'
  }
  if (isIP(h)) {
    return esIpPrivada(h) ? 'Servidor de correo no permitido' : null
  }
  try {
    const direcciones = await lookup(h, { all: true })
    if (direcciones.length === 0) return 'No se pudo resolver el servidor de correo'
    for (const d of direcciones) {
      if (esIpPrivada(d.address)) return 'Servidor de correo no permitido'
    }
  } catch {
    return 'No se pudo resolver el servidor de correo'
  }
  return null
}

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

    if (
      !email || typeof email !== 'string' ||
      !password || typeof password !== 'string' ||
      !server || typeof server !== 'string' ||
      typeof port !== 'number'
    ) {
      return badRequest(new Error('email, password, server y port son requeridos'))
    }

    // Anti-SSRF: solo puertos IMAP, host sin IPs/redes privadas (resueltas
    // con DNS antes de conectar) y TLS con certificado verificado.
    if (!PUERTOS_IMAP_PERMITIDOS.has(port)) {
      return badRequest(new Error('Puerto no permitido (usa 143 o 993)'))
    }
    const motivoRechazo = await hostImapSeguro(server)
    if (motivoRechazo) {
      return badRequest(new Error(motivoRechazo))
    }

    const { ImapFlow } = await import('imapflow')
    const { simpleParser } = await import('mailparser')

    const imap = new ImapFlow({
      host: server,
      port,
      secure: port === 993,
      auth: { user: email, pass: password },
      logger: false,
      tls: { rejectUnauthorized: true },
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
