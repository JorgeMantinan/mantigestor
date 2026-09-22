import { NextResponse } from 'next/server'
import { resolvePerfilActivo } from '@/lib/resolve-perfil-activo'
import { createServerClient } from '@supabase/ssr'
import type { NextRequest } from 'next/server'

export async function GET(req: NextRequest) {
  const { perfilId, error } = await resolvePerfilActivo(req)
  if (error || !perfilId) {
    return NextResponse.json({ error: error ?? 'No autorizado' }, { status: 401 })
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

  const url = new URL(req.url)
  const entidad = url.searchParams.get('entidad')
  const accion = url.searchParams.get('accion')
  const desde = url.searchParams.get('desde')
  const hasta = url.searchParams.get('hasta')

  let query = supabase
    .from('audit_log')
    .select('*')
    .eq('perfilId', perfilId)
    .order('createdAt', { ascending: false })
    .limit(200)

  if (entidad) query = query.eq('entidad', entidad)
  if (accion) query = query.eq('accion', accion)
  if (desde) query = query.gte('createdAt', desde)
  if (hasta) query = query.lte('createdAt', hasta + 'T23:59:59')

  const { data, error: dbError } = await query
  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 })
  }

  return NextResponse.json({ entradas: data ?? [] })
}
