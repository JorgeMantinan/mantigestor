import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { FacturaSchema } from '@mantigestor/utils'
import { getAuthenticatedUser, unauthorized, notFound, badRequest, serverError } from '@/lib/api-helpers'
import { rateLimitByIp } from '@/lib/rate-limit-ip'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { success } = rateLimitByIp(req)
    if (!success) {
      return NextResponse.json(
        { error: 'Demasiadas peticiones. Intenta de nuevo en un minuto.' },
        { status: 429 }
      )
    }
    const user = await getAuthenticatedUser(req)
    if (!user) return unauthorized()

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
      .eq('perfilId', user.id)
      .single()

    if (error || !data) return notFound('Factura no encontrada')
    return Response.json({ data })
  } catch (error) {
    return serverError(error)
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { success } = rateLimitByIp(req)
    if (!success) {
      return NextResponse.json(
        { error: 'Demasiadas peticiones. Intenta de nuevo en un minuto.' },
        { status: 429 }
      )
    }
    const user = await getAuthenticatedUser(req)
    if (!user) return unauthorized()

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
      .eq('perfilId', user.id)
      .single()

    if (findError || !existente) return notFound('Factura no encontrada')

    const body = await req.json()
    const parsed = FacturaSchema.partial().safeParse(body)
    if (!parsed.success) return badRequest(parsed.error.flatten().fieldErrors)

    const { fechaEmision, ...rest } = parsed.data
    const updateData: Record<string, unknown> = { ...rest }

    if (fechaEmision) updateData.fechaEmision = fechaEmision.toISOString()
    if (rest.baseImponible != null || rest.iva != null) {
      const base = rest.baseImponible ?? existente.baseImponible
      const iva = rest.iva ?? existente.iva
      updateData.total = base + Math.round(base * iva / 100)
    }

    const { data, error } = await supabase
      .from('facturas')
      .update(updateData)
      .eq('id', params.id)
      .select()
      .single()

    if (error) throw error
    return Response.json({ data })
  } catch (error) {
    return serverError(error)
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { success } = rateLimitByIp(req)
    if (!success) {
      return NextResponse.json(
        { error: 'Demasiadas peticiones. Intenta de nuevo en un minuto.' },
        { status: 429 }
      )
    }
    const user = await getAuthenticatedUser(req)
    if (!user) return unauthorized()

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
      .select('id')
      .eq('id', params.id)
      .eq('perfilId', user.id)
      .single()

    if (findError || !existente) return notFound('Factura no encontrada')

    const { error } = await supabase.from('facturas').delete().eq('id', params.id)
    if (error) throw error

    return Response.json({ data: null })
  } catch (error) {
    return serverError(error)
  }
}
