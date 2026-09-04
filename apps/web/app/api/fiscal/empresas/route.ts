import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { z } from 'zod'
import { getAuthenticatedUser, unauthorized, serverError, badRequest } from '@/lib/api-helpers'
import { rateLimitByIp } from '@/lib/rate-limit-ip'

const EmpresaSchema = z.object({
  nombre: z.string().min(1).max(100),
  nif: z.string().min(1).max(20),
  direccion: z.string().max(200).optional().default(''),
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
      return NextResponse.json({ error: 'Demasiadas peticiones' }, { status: 429 })
    }
    const user = await getAuthenticatedUser(req)
    if (!user) return unauthorized()

    const supabase = supabaseDeReq(req)
    const { data, error: queryError } = await supabase
      .from('perfiles')
      .select('id, empresas')
      .eq('userId', user.id)
      .maybeSingle()

    if (queryError) {
      console.error('Error querying empresas:', queryError.message)
      // Column might not exist — return empty
      return Response.json({ empresas: [] })
    }

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
      return NextResponse.json({ error: 'Demasiadas peticiones' }, { status: 429 })
    }
    const user = await getAuthenticatedUser(req)
    if (!user) return unauthorized()

    const body: unknown = await req.json()
    const parsed = EmpresaSchema.safeParse(body)
    if (!parsed.success) {
      console.error('Zod validation error:', parsed.error.flatten())
      return badRequest(new Error(`Datos inválidos: ${parsed.error.issues.map(i => i.message).join(', ')}`))
    }

    const supabase = supabaseDeReq(req)

    // Buscar perfil del usuario autenticado
    const { data: perfil, error: perfilError } = await supabase
      .from('perfiles')
      .select('id, empresas')
      .eq('userId', user.id)
      .maybeSingle()

    if (perfilError) {
      console.error('Error fetching profile:', perfilError.message, perfilError.code)
      return serverError(new Error('Error al buscar perfil: ' + perfilError.message))
    }

    if (!perfil) {
      // Crear perfil para este usuario
      const { error: createError } = await supabase
        .from('perfiles')
        .insert({
          id: crypto.randomUUID(),
          userId: user.id,
          email: user.email ?? '',
        })
      if (createError) {
        console.error('Error creating profile:', createError.message, createError.code)
        return serverError(new Error('No se pudo crear el perfil: ' + createError.message))
      }
      // Re-fetch
      const { data: newPerfil } = await supabase
        .from('perfiles')
        .select('id, empresas')
        .eq('userId', user.id)
        .maybeSingle()
      if (!newPerfil) return serverError(new Error('Perfil no encontrado tras crear'))
      return guardarEmpresa(newPerfil, parsed.data, supabase)
    }

    return guardarEmpresa(perfil, parsed.data, supabase)
  } catch (error) {
    return serverError(error)
  }
}

async function guardarEmpresa(
  perfil: { id: string; empresas: string | null },
  data: { nombre: string; nif: string; direccion: string },
  supabase: ReturnType<typeof supabaseDeReq>
) {
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
    ...data,
    activa: empresas.length === 0,
  }
  empresas.push(nuevaEmpresa)

  const { error } = await supabase
    .from('perfiles')
    .update({ empresas: JSON.stringify(empresas), updatedAt: new Date().toISOString() })
    .eq('id', perfil.id)

  if (error) {
    console.error('Error saving empresa:', error.message, error.code)
    return serverError(new Error('No se pudo guardar: ' + error.message))
  }

  return Response.json({ empresa: nuevaEmpresa })
}
