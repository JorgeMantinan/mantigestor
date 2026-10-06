import { NextResponse, type NextRequest } from 'next/server'
import { getAuthenticatedUser, getSupabaseServer, unauthorized, badRequest, serverError } from '@/lib/api-helpers'
import { rateLimitByIp } from '@/lib/rate-limit-ip'
import { resolvePerfilActivo, esSoloLectura } from '@/lib/resolve-perfil-activo'
import { z } from 'zod'

const PlantillaRecurrenteSchema = z.object({
  tipo: z.string().min(1).max(30),
  numero: z.string().min(1).max(50),
  emisorReceptor: z.string().min(1).max(200),
  nifContraparte: z.string().max(20).nullable().optional(),
  baseImponible: z.number().positive().max(10000000),
  iva: z.union([z.literal(0), z.literal(4), z.literal(10), z.literal(21)]),
  diaGeneracion: z.number().int().min(1).max(28),
  diaEmail: z.number().int().min(1).max(28).nullable().optional(),
  notas: z.string().max(2000).nullable().optional(),
})

export async function GET(req: NextRequest) {
  try {
    const { success } = await rateLimitByIp(req)
    if (!success) {
      return NextResponse.json({ error: 'Demasiadas peticiones' }, { status: 429 })
    }

    const user = await getAuthenticatedUser(req)
    if (!user) return unauthorized()

    const { perfilId } = await resolvePerfilActivo(req)

    const supabase = await getSupabaseServer(req)
    const { data, error } = await supabase
      .from('facturas_recurrentes')
      .select('*')
      .eq('perfilId', perfilId)
      .order('createdAt', { ascending: false })

    if (error) throw error
    return NextResponse.json(data)
  } catch (error) {
    return serverError(error)
  }
}

export async function POST(req: NextRequest) {
  try {
    const { success } = await rateLimitByIp(req, { maxRequests: 20, windowMs: 60 * 1000 })
    if (!success) {
      return NextResponse.json({ error: 'Demasiadas peticiones' }, { status: 429 })
    }

    const user = await getAuthenticatedUser(req)
    if (!user) return unauthorized()

    const { perfilId, rol } = await resolvePerfilActivo(req)
    // Escritura bloqueada para perfiles en modo solo lectura (visualizador)
    if (esSoloLectura(rol)) {
      return NextResponse.json({ error: 'El perfil está en modo solo lectura' }, { status: 403 })
    }

    const body = await req.json().catch(() => null)
    const parsed = PlantillaRecurrenteSchema.safeParse(body)
    if (!parsed.success) {
      return badRequest(parsed.error.flatten().fieldErrors)
    }
    const { tipo, numero, emisorReceptor, nifContraparte, baseImponible, iva, diaGeneracion, diaEmail, notas } = parsed.data

    const id = crypto.randomUUID()
    const supabase = await getSupabaseServer(req)
    const { data, error } = await supabase
      .from('facturas_recurrentes')
      .insert({
        id,
        perfilId,
        tipo,
        numero,
        emisorReceptor,
        nifContraparte: nifContraparte || null,
        baseImponible: Math.round(baseImponible * 100),
        iva,
        diaGeneracion,
        diaEmail: diaEmail ?? null,
        activa: true,
        notas: notas ?? null,
      })
      .select()
      .single()

    if (error) throw error
    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    return serverError(error)
  }
}
