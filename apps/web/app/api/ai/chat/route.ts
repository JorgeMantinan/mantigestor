import { NextResponse, type NextRequest } from 'next/server'
import { getAuthenticatedUser, unauthorized, badRequest, serverError } from '@/lib/api-helpers'
import { rateLimitByIp } from '@/lib/rate-limit-ip'

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY

const SYSTEM_PROMPT = `Eres un asistente especializado en fiscalidad española para autónomos.
Ayudas a usuarios de MantiGestor, una aplicación de gestión financiera y fiscal.
Responde preguntas sobre:

- IVA (tipos, facturación, deducciones, Modelo 303)
- IRPF (retenciones, pagos fraccionados, Modelo 130)
- Facturación electrónica (SII, TicketBAI)
- Gastos deducibles para autónomos
- Calendario fiscal y plazos de presentación
- Gestión de alquiler (IRPF, deducciones)
- Nóminas y Seguridad Social para empleadas del hogar
- Cómo usar las funcionalidades de MantiGestor

Sé conciso, preciso y da ejemplos prácticos cuando sea posible.
Si no sabes algo, indícalo claramente.`

export async function POST(req: NextRequest) {
  try {
    const { success } = rateLimitByIp(req, { maxRequests: 10, windowMs: 60 * 1000 })
    if (!success) {
      return NextResponse.json(
        { error: 'Demasiadas peticiones. Intenta de nuevo en un minuto.' },
        { status: 429 }
      )
    }
    const user = await getAuthenticatedUser(req)
    if (!user) return unauthorized()

    const { mensaje, historial } = await req.json()
    if (!mensaje || typeof mensaje !== 'string') {
      return badRequest('Mensaje requerido')
    }

    if (!ANTHROPIC_API_KEY) {
      return Response.json({
        respuesta: 'La API de IA no está configurada. Configura ANTHROPIC_API_KEY en tu .env.local para usar esta funcionalidad. Mientras tanto, puedes consultarme sobre conceptos generales de fiscalidad.',
      })
    }

    const messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...(historial ?? []).map((m: { role: string; content: string }) => ({
        role: m.role,
        content: m.content,
      })),
      { role: 'user', content: mensaje },
    ]

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-sonnet-20241022',
        max_tokens: 1024,
        messages,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Anthropic API error:', response.status, errorText)
      return Response.json({
        respuesta: 'Lo siento, hubo un error al conectar con la IA. Por favor, inténtalo de nuevo más tarde.',
      })
    }

    const data = await response.json()
    const respuesta = data.content?.[0]?.text ?? 'No se pudo generar una respuesta.'

    return Response.json({ respuesta })
  } catch (error) {
    return serverError(error)
  }
}
