import { createClient } from '@/lib/supabase/client'
import { createServerClient } from '@supabase/ssr'

type Accion = 'crear' | 'editar' | 'eliminar' | 'cambio_estado' | 'ver' | 'exportar'
type Entidad = 'factura' | 'propiedad' | 'nomina' | 'suscripcion' | 'proforma' | 'documento' | 'ajuste' | 'empresa' | 'conciliacion'

export async function logAccion(
  accion: Accion,
  entidad: Entidad,
  entidadId: string | null,
  detalle?: string,
  meta?: Record<string, unknown>,
  perfilIdExplicit?: string
) {
  try {
    const supabase = createClient()

    let perfilId = perfilIdExplicit
    if (!perfilId && typeof document !== 'undefined') {
      const match = document.cookie.match(/perfilActivoId=([^;]+)/)
      if (match?.[1]) perfilId = match[1]
    }
    if (!perfilId) {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: perfil } = await supabase
        .from('perfiles')
        .select('id')
        .eq('userId', user.id)
        .single()
      if (!perfil) return
      perfilId = perfil.id
    }

    await supabase.from('audit_log').insert({
      id: crypto.randomUUID(),
      perfilId,
      accion,
      entidad,
      entidadId,
      detalle: detalle ?? null,
      meta: meta ? JSON.stringify(meta) : null,
      createdAt: new Date().toISOString(),
    })
  } catch {
    // Silently fail — audit logging should never break the UI
  }
}

export async function registrarAccion(
  req: { cookies: { get: (name: string) => { value?: string } | undefined } },
  perfilId: string,
  entidad: Entidad,
  entidadId: string,
  accion: Accion,
  detalles?: Record<string, unknown>
) {
  try {
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

    await supabase.from('audit_log').insert({
      id: crypto.randomUUID(),
      perfilId,
      accion,
      entidad,
      entidadId,
      detalle: detalles ? JSON.stringify(detalles) : null,
      meta: null,
      createdAt: new Date().toISOString(),
    })
  } catch {
    // Silently fail — audit logging should never break the API
  }
}
