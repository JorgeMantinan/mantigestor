import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { getAuthenticatedUser, unauthorized, serverError, badRequest } from '@/lib/api-helpers'
import { rateLimitByIp } from '@/lib/rate-limit-ip'

const EmpresaSchema = z.object({
  nombre: z.string().min(1).max(100),
  nif: z.string().min(1).max(20),
  direccion: z.string().max(200).optional().default(''),
})

function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
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

    const supabase = supabaseAdmin()
    const { data, error: queryError } = await supabase
      .from('perfiles')
      .select('id, empresas')
      .eq('userId', user.id)
      .maybeSingle()

    if (queryError) {
      // Column empresas might not exist yet — return empty list
      console.error('Error querying empresas:', queryError.message)
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

    const supabase = supabaseAdmin()
    const { data: perfil, error: perfilError } = await supabase
      .from('perfiles')
      .select('id, empresas')
      .eq('userId', user.id)
      .maybeSingle()

    if (perfilError) {
      console.error('Error fetching profile:', perfilError.message)
      return serverError(new Error('Error al buscar perfil: ' + perfilError.message))
    }

    if (!perfil) {
      // Try to create profile for this user
      const { error: createError } = await supabase
        .from('perfiles')
        .insert({
          id: crypto.randomUUID(),
          userId: user.id,
          email: user.email ?? '',
        })
      if (createError) {
        console.error('Error creating profile:', createError.message)
        return serverError(new Error('Perfil no encontrado y no se pudo crear'))
      }
      // Re-fetch
      const { data: newPerfil } = await supabase
        .from('perfiles')
        .select('id, empresas')
        .eq('userId', user.id)
        .maybeSingle()
      if (!newPerfil) return serverError(new Error('Perfil no encontrado'))
      return await crearEmpresaConPerfil(newPerfil, parsed.data, supabase)
    }

    return await crearEmpresaConPerfil(perfil, parsed.data, supabase)
  } catch (error) {
    return serverError(error)
  }
}

async function crearEmpresaConPerfil(
  perfil: { id: string; empresas: string | null },
  data: { nombre: string; nif: string; direccion: string },
  supabase: ReturnType<typeof supabaseAdmin>
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
    console.error('Error saving empresa:', error.message)
    // If column empresas doesn't exist, try to add it via SQL
    if (error.message.includes('column') && error.message.includes('empresas')) {
      return serverError(new Error('La columna empresas no existe en la base de datos. Ejecuta la migración: ALTER TABLE perfiles ADD COLUMN empresas TEXT;'))
    }
    return serverError(new Error('No se pudo guardar la empresa: ' + error.message))
  }

  return Response.json({ empresa: nuevaEmpresa })
}
