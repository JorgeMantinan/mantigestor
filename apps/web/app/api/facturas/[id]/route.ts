import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { FacturaSchema } from '@mantigestor/utils'
import { getAuthenticatedUser, unauthorized, notFound, badRequest, serverError } from '@/lib/api-helpers'
import { rateLimitByIp } from '@/lib/rate-limit-ip'
import { resolvePerfilActivo, esSoloLectura } from '@/lib/resolve-perfil-activo'
import { registrarAccion } from '@/lib/audit-log'
import { regenerarModelosDeFecha } from '@/lib/fiscal/modelos-generados'

export async function GET(
  req: NextRequest,
  segmento: { params: Promise<{ id: string }> }
) {
  const params = await segmento.params
  try {
    const { success } = await rateLimitByIp(req)
    if (!success) {
      return NextResponse.json(
        { error: 'Demasiadas peticiones. Intenta de nuevo en un minuto.' },
        { status: 429 }
      )
    }
    const user = await getAuthenticatedUser(req)
    if (!user) return unauthorized()

    const { perfilId } = await resolvePerfilActivo(req)

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

    const { data, error } = await supabase
      .from('facturas')
      .select('*')
      .eq('id', params.id)
      .eq('perfilId', perfilId)
      .single()

    if (error || !data) return notFound('Factura no encontrada')
    return Response.json({ data })
  } catch (error) {
    return serverError(error)
  }
}

export async function PUT(
  req: NextRequest,
  segmento: { params: Promise<{ id: string }> }
) {
  const params = await segmento.params
  try {
    const { success } = await rateLimitByIp(req)
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

    const { data: existente, error: findError } = await supabase
      .from('facturas')
      .select('*')
      .eq('id', params.id)
      .eq('perfilId', perfilId)
      .single()

    if (findError || !existente) return notFound('Factura no encontrada')

    // Save version before update
    try {
      const { data: ultimaVersion } = await supabase
        .from('versiones_registro')
        .select('version')
        .eq('perfilId', perfilId)
        .eq('entidad', 'factura')
        .eq('entidadId', params.id)
        .order('version', { ascending: false })
        .limit(1)
        .single()

      const nuevaVersion = (ultimaVersion?.version ?? 0) + 1

      await supabase.from('versiones_registro').insert({
        id: crypto.randomUUID(),
        perfilId,
        entidad: 'factura',
        entidadId: params.id,
        version: nuevaVersion,
        datos: existente,
        usuarioId: user.id,
        creadoEn: new Date().toISOString(),
      })
    } catch {
      // Version saving should not break the update
    }

    const body = await req.json()
    const parsed = FacturaSchema.partial().safeParse(body)
    if (!parsed.success) return badRequest(parsed.error.flatten().fieldErrors)

    const { fechaEmision, ...rest } = parsed.data
    const updateData: Record<string, unknown> = { ...rest }

    if (fechaEmision) updateData.fechaEmision = fechaEmision.toISOString()
    if (rest.baseImponible != null || rest.iva != null) {
      const base = rest.baseImponible ?? existente.baseImponible
      const iva = rest.iva ?? existente.iva
      const descuento = existente.descuentoPorcentaje ?? 0
      const importeDescuento = Math.round(base * descuento / 100)
      updateData.total = base + Math.round(base * iva / 100) - importeDescuento
    }

    const { data, error } = await supabase
      .from('facturas')
      .update(updateData)
      .eq('id', params.id)
      .select()
      .single()

    if (error) throw error

    await registrarAccion(req, perfilId, 'factura', params.id, 'editar', {
      camposModificados: Object.keys(updateData),
    })

    // Regenerar modelos: periodo anterior (si cambió la fecha) y periodo nuevo
    await regenerarModelosDeFecha(supabase, perfilId, String(existente.fechaEmision))
    const fechaFinal = fechaEmision ? fechaEmision.toISOString() : String(existente.fechaEmision)
    await regenerarModelosDeFecha(supabase, perfilId, fechaFinal)

    return Response.json({ data })
  } catch (error) {
    return serverError(error)
  }
}

export async function DELETE(
  req: NextRequest,
  segmento: { params: Promise<{ id: string }> }
) {
  const params = await segmento.params
  try {
    const { success } = await rateLimitByIp(req)
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

    const { data: eliminada, error } = await supabase.from('facturas').delete()
      .eq('id', params.id)
      .eq('perfilId', perfilId)
      .select('id, fechaEmision')
    if (error) throw error
    if (!eliminada || eliminada.length === 0) return notFound('Factura no encontrada')

    await registrarAccion(req, perfilId, 'factura', params.id, 'eliminar', {
      facturaId: params.id,
    })

    // Regenerar los modelos fiscales del periodo de la factura eliminada
    if (eliminada[0]?.fechaEmision) {
      await regenerarModelosDeFecha(supabase, perfilId, String(eliminada[0].fechaEmision))
    }

    return Response.json({ data: null })
  } catch (error) {
    return serverError(error)
  }
}
