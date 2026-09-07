import { NextResponse, type NextRequest } from 'next/server'
import { getAuthenticatedUser, unauthorized, badRequest, serverError } from '@/lib/api-helpers'
import { rateLimitByIp } from '@/lib/rate-limit-ip'
import { createServerClient } from '@supabase/ssr'
import { resolvePerfilActivo } from '@/lib/resolve-perfil-activo'
import { z } from 'zod'

const ExamenBodySchema = z.object({}).passthrough()

export async function POST(req: NextRequest) {
  try {
    const { success } = rateLimitByIp(req, { maxRequests: 10, windowMs: 60 * 1000 })
    if (!success) {
      return NextResponse.json({ error: 'Demasiadas peticiones. Intenta de nuevo en un minuto.' }, { status: 429 })
    }

    const user = await getAuthenticatedUser(req)
    if (!user) return unauthorized()

    const { perfilId } = await resolvePerfilActivo(req)

    const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY
    if (!ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: 'La API de IA no está configurada. Configura ANTHROPIC_API_KEY en tu .env.local.' },
        { status: 503 }
      )
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

    const body = await req.json()
    const parsedBody = ExamenBodySchema.safeParse(body)
    if (!parsedBody.success) {
      return badRequest('Cuerpo de solicitud inválido')
    }

    const { data: docs } = await supabase
      .from('documentos')
      .select('id, nombre, url, tipo, tamanoBytes')
      .eq('perfilId', perfilId)
      .eq('tipo', 'alumno')

    if (!docs || docs.length === 0) {
      return badRequest('No hay documentos de tipo alumno para generar un examen')
    }

    const MAX_DOC_SIZE = 5 * 1024 * 1024 // 5MB per document
    const oversized = docs.filter((d: { tamanoBytes?: number }) => d.tamanoBytes && d.tamanoBytes > MAX_DOC_SIZE)
    if (oversized.length > 0) {
      return NextResponse.json(
        { error: `Documentos demasiado grandes: ${oversized.map((d: { nombre: string }) => d.nombre).join(', ')}. Máximo 5MB por documento.` },
        { status: 400 }
      )
    }

    const { data: examen, error: insertError } = await supabase
      .from('examenes')
      .insert({
        id: crypto.randomUUID(),
        perfilId,
        tipo: 'alumnos',
        estado: 'pendiente',
        creadoEn: new Date().toISOString(),
      })
      .select()
      .single()

    if (insertError) throw insertError

    const documentBlocks: { type: string; source: { type: string; media_type: string; data: string }; title?: string }[] = []

    for (const doc of docs.slice(0, 5)) {
      try {
        const resp = await fetch(doc.url)
        if (!resp.ok) continue
        const buffer = await resp.arrayBuffer()
        const base64 = Buffer.from(buffer).toString('base64')
        const ext = doc.nombre.split('.').pop()?.toLowerCase()
        const mediaType = ext === 'pdf' ? 'application/pdf' : ext === 'txt' ? 'text/plain' : ext === 'md' ? 'text/markdown' : 'application/octet-stream'
        documentBlocks.push({
          type: 'document',
          source: { type: 'base64', media_type: mediaType, data: base64 },
          title: doc.nombre,
        })
      } catch {
        continue
      }
    }

    if (documentBlocks.length === 0) {
      await supabase.from('examenes').update({ estado: 'error', resultado: 'No se pudieron leer los documentos' }).eq('id', examen.id)
      return NextResponse.json({ error: 'No se pudieron leer los documentos' }, { status: 400 })
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-sonnet-20241022',
        max_tokens: 4096,
        messages: [
          {
            role: 'user',
            content: [
              ...documentBlocks.map((b) => ({ type: b.type, source: b.source, title: b.title })),
              {
                type: 'text',
                text: `Genera un examen tipo test basado en los documentos adjuntos. El examen debe tener 10 preguntas con 4 opciones cada una (A, B, C, D), indicando cuál es la respuesta correcta.

Devuelve SOLO un objeto JSON válido sin explicaciones adicionales, con esta estructura:
{
  "titulo": "Título del examen",
  "preguntas": [
    {
      "pregunta": "Texto de la pregunta",
      "opciones": { "A": "Opción A", "B": "Opción B", "C": "Opción C", "D": "Opción D" },
      "correcta": "A"
    }
  ]
}`,
              },
            ],
          },
        ],
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Claude API error:', response.status, errorText)
      await supabase.from('examenes').update({ estado: 'error', resultado: 'Error al generar el examen con la IA' }).eq('id', examen.id)
      return NextResponse.json({ error: 'Error al generar el examen' }, { status: 500 })
    }

    const data = await response.json()
    const text = data.content?.[0]?.text ?? ''

    const jsonMatch = text.match(/\{[\s\S]*\}/)
    const resultado = jsonMatch ? text : 'No se pudo generar el examen'

    await supabase
      .from('examenes')
      .update({ estado: 'completado', resultado, completadoEn: new Date().toISOString() })
      .eq('id', examen.id)

    const { data: examenFinal } = await supabase
      .from('examenes')
      .select('*')
      .eq('id', examen.id)
      .single()

    return NextResponse.json(examenFinal ?? examen)
  } catch (error) {
    return serverError(error)
  }
}
