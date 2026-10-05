import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { getAuthenticatedUser, unauthorized, badRequest, serverError } from '@/lib/api-helpers'
import { rateLimitByIp } from '@/lib/rate-limit-ip'
import { resolvePerfilActivo } from '@/lib/resolve-perfil-activo'
import { extractInvoiceData, esUrlStorageSegura, type OcrResult } from '@/lib/ocr'
import { firmarUrlAdmin, carpetaDeUrlStorage } from '@/lib/storage-server'


export const maxDuration = 120
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
    const { success } = await rateLimitByIp(req, { maxRequests: 3, windowMs: 60 * 1000 })
    if (!success) {
      return NextResponse.json({ error: 'Demasiadas peticiones de OCR en lote' }, { status: 429 })
    }

    const user = await getAuthenticatedUser(req)
    if (!user) return unauthorized()

    const { archivos } = await req.json() as { archivos?: ArchivoBatch[] }
    if (!Array.isArray(archivos) || archivos.length === 0 || archivos.length > 10) {
      return badRequest('Debes enviar entre 1 y 10 archivos')
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

    const CONCURRENT_LIMIT = 5

    async function procesarArchivo(archivo: ArchivoBatch): Promise<ResultadoBatch> {
      if (!archivo.url || !archivo.nombre) {
        return { nombre: archivo.nombre ?? '(sin nombre)', resultado: null, error: 'URL o nombre inválido' }
      }

      if (!esUrlStorageSegura(archivo.url)) {
        return { nombre: archivo.nombre, resultado: null, error: 'URL de documento no permitida' }
      }

      // El documento debe vivir en la carpeta del perfil activo (bucket privado)
      if (carpetaDeUrlStorage(archivo.url) !== perfilId) {
        return { nombre: archivo.nombre, resultado: null, error: 'URL de documento no permitida' }
      }

      const { data: existente } = await supabase
        .from('facturas')
        .select('id')
        .eq('perfilId', perfilId)
        .ilike('emisorReceptor', `%${archivo.nombre.replace(/\.[^/.]+$/, '')}%`)
        .limit(1)

      if (existente && existente.length > 0) {
        return { nombre: archivo.nombre, resultado: null, error: 'Ya existe una factura con este nombre' }
      }

      try {
        const resultado = await extractInvoiceData(await firmarUrlAdmin(archivo.url))
        return { nombre: archivo.nombre, resultado }
      } catch (err) {
        const mensaje = err instanceof Error ? err.message : 'Error al procesar'
        return { nombre: archivo.nombre, resultado: null, error: mensaje }
      }
    }

    const resultados: ResultadoBatch[] = []
    for (let i = 0; i < archivos.length; i += CONCURRENT_LIMIT) {
      const chunk = archivos.slice(i, i + CONCURRENT_LIMIT)
      const chunkResults = await Promise.all(chunk.map(procesarArchivo))
      resultados.push(...chunkResults)
    }

    return NextResponse.json({ resultados })
  } catch (error) {
    return serverError(error)
  }
}
