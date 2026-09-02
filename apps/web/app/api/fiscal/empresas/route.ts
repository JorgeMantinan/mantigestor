import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { z } from 'zod'
import { getAuthenticatedUser, unauthorized, serverError, badRequest } from '@/lib/api-helpers'
import { rateLimitByIp } from '@/lib/rate-limit-ip'

const EmpresaSchema = z.object({
  nombre: z.string().min(1).max(100),
  nif: z.string().min(1).max(20),
  direccion: z.string().max(200),
})

function supabaseDeReq(req: NextRequest) {
  return createServerClient(
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
}

export async function GET(req: NextRequest) {
  try {
    const { success } = rateLimitByIp(req)
    if (!success) {
      return NextResponse.json({ error: 'Demasiadas peticiones. Intenta de nuevo en un minuto.' }, { status: 429 })
    }
    const user = await getAuthenticatedUser(req)
    if (!user) return unauthorized()

    const supabase = supabaseDeReq(req)
    const { data } = await supabase
      .from('perfiles')
      .select('empresas')
      .eq('userId', user.id)
      .maybeSingle()

    let empresas: unknown[] = []
    if (data?.empresas) {
      try {
        empresas = JSON.parse(data.empresas)
      } catch {
        empresas = []
      }
    }

    return Response.json({ empresas })
  } catch (error) {
    return serverError(error)
  }
}

export async function POST(req: NextRequest) {
  try {
    const { success } = rateLimitByIp(req)
    if (!success) {
      return NextResponse.json({ error: 'Demasiadas peticiones. Intenta de nuevo en un minuto.' }, { status: 429 })
    }
    const user = await getAuthenticatedUser(req)
    if (!user) return unauthorized()

    const body: unknown = await req.json()
    const parsed = EmpresaSchema.safeParse(body)
    if (!parsed.success) return badRequest('Datos de empresa inválidos')

    const supabase = supabaseDeReq(req)
    const { data: perfil } = await supabase
      .from('perfiles')
      .select('id, empresas')
      .eq('userId', user.id)
      .maybeSingle()

    if (!perfil) return badRequest('Perfil no encontrado')

    let empresas: { id: string; nombre: string; nif: string; direccion: string; activa: boolean }[] = []
    if (perfil.empresas) {
      try {
        empresas = JSON.parse(perfil.empresas)
      } catch {
        empresas = []
      }
    }

    const nuevaEmpresa = {
      id: crypto.randomUUID(),
      ...parsed.data,
      activa: empresas.length === 0,
    }
    empresas.push(nuevaEmpresa)

    const { error } = await supabase
      .from('perfiles')
      .update({ empresas: JSON.stringify(empresas), updatedAt: new Date().toISOString() })
      .eq('id', perfil.id)

    if (error) throw new Error('No se pudo guardar la empresa')

    return Response.json({ empresa: nuevaEmpresa })
  } catch (error) {
    return serverError(error)
  }
}
