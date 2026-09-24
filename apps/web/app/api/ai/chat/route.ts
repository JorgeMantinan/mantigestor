import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { getAuthenticatedUser, unauthorized, badRequest, serverError } from '@/lib/api-helpers'
import { rateLimitByIp } from '@/lib/rate-limit-ip'
import { resolvePerfilActivo } from '@/lib/resolve-perfil-activo'
import { z } from 'zod'

const ChatMessageSchema = z.object({
  mensaje: z.string().min(1, 'Mensaje requerido'),
  historial: z.array(z.object({
    role: z.string(),
    content: z.string(),
  })).optional(),
  contexto: z.enum(['facturas', 'fiscal', 'nominas', 'alquiler', 'general']).optional(),
})

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
    const { success } = await rateLimitByIp(req, { maxRequests: 10, windowMs: 60 * 1000 })
    if (!success) {
      return NextResponse.json(
        { error: 'Demasiadas peticiones. Intenta de nuevo en un minuto.' },
        { status: 429 }
      )
    }
    const user = await getAuthenticatedUser(req)
    if (!user) return unauthorized()

    const body = await req.json()
    const parsed = ChatMessageSchema.safeParse(body)
    if (!parsed.success) {
      return badRequest(parsed.error.flatten().fieldErrors)
    }

    const { mensaje, contexto } = parsed.data

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

    const { perfilId } = await resolvePerfilActivo(req)

    if (!perfilId) {
      return NextResponse.json(
        { error: 'Perfil no encontrado' },
        { status: 404 }
      )
    }

    await supabase.from('chat_historial').insert({
      id: crypto.randomUUID(),
      perfilId,
      rol: 'user',
      contenido: mensaje,
    })

    const { data: historialDB } = await supabase
      .from('chat_historial')
      .select('rol, contenido')
      .eq('perfilId', perfilId)
      .order('creadoEn', { ascending: true })
      .limit(20)

    if (!ANTHROPIC_API_KEY) {
      return Response.json({
        respuesta: 'La API de IA no está configurada. Configura ANTHROPIC_API_KEY en tu .env.local para usar esta funcionalidad. Mientras tanto, puedes consultarme sobre conceptos generales de fiscalidad.',
      })
    }

    const contextoPrompt = contexto && contexto !== 'general'
      ? `\n\nEl usuario está navegando actualmente por la sección "${contexto.toUpperCase()}" del dashboard de MantiGestor. Contextualiza tus respuestas a esta sección:
- facturas: facturación, estados, pagos, crear/editar facturas, vencimientos
- fiscal: modelos fiscales (303, 130, 111, 100, RETA), plazos, deducciones
- nominas: nóminas, retenciones IRPF, Seguridad Social, empleados del hogar
- alquiler: alquiler de viviendas, gastos deducibles, declarar ingresos por alquiler`
      : ''

    const messages = [
      { role: 'system', content: SYSTEM_PROMPT + contextoPrompt },
      ...(historialDB ?? []).map(m => ({
        role: m.rol as 'user' | 'assistant',
        content: m.contenido,
      })),
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

    await supabase.from('chat_historial').insert({
      id: crypto.randomUUID(),
      perfilId,
      rol: 'assistant',
      contenido: respuesta,
    })

    return Response.json({ respuesta, contexto })
  } catch (error) {
    return serverError(error)
  }
}
