import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { getAuthenticatedUser, unauthorized, badRequest, serverError } from '@/lib/api-helpers'
import { rateLimitByIp } from '@/lib/rate-limit-ip'
import { resolvePerfilActivo } from '@/lib/resolve-perfil-activo'
import { extractInvoiceData, type OcrResult } from '@/lib/ocr'

interface ArchivoBatch {
  url: string
  nombre: string
}

interface ResultadoBatch {
  nombre: string
  resultado: OcrResult | null
  error?: string
}

export async function POST(req: NextRequest) {
  try {
    const { success } = rateLimitByIp(req, { maxRequests: 3, windowMs: 60 * 1000 })
    if (!success) {
      return NextResponse.json({ error: 'Demasiadas peticiones de OCR en lote' }, { status: 429 })
    }

    const user = await getAuthenticatedUser(req)
    if (!user) return unauthorized()

    const { archivos } = await req.json() as { archivos?: ArchivoBatch[] }
    if (!Array.isArray(archivos) || archivos.length === 0 || archivos.length > 10) {
      return badRequest('Debes enviar entre 1 y 10 archivos')
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: 'API de IA no configurada' }, { status: 503 })
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

    const { perfilId } = await resolvePerfilActivo(req)

    const resultados: ResultadoBatch[] = []

    for (const archivo of archivos) {
      if (!archivo.url || !archivo.nombre) {
        resultados.push({ nombre: archivo.nombre ?? '(sin nombre)', resultado: null, error: 'URL o nombre inválido' })
        continue
      }

      const { data: existente } = await supabase
        .from('facturas')
        .select('id')
        .eq('perfilId', perfilId)
        .ilike('emisorReceptor', `%${archivo.nombre.replace(/\.[^/.]+$/, '')}%`)
        .limit(1)

      if (existente && existente.length > 0) {
        resultados.push({ nombre: archivo.nombre, resultado: null, error: 'Ya existe una factura con este nombre' })
        continue
      }

      try {
        const resultado = await extractInvoiceData(archivo.url)
        resultados.push({ nombre: archivo.nombre, resultado })
      } catch (err) {
        const mensaje = err instanceof Error ? err.message : 'Error al procesar'
        resultados.push({ nombre: archivo.nombre, resultado: null, error: mensaje })
      }
    }

    return NextResponse.json({ resultados })
  } catch (error) {
    return serverError(error)
  }
}
