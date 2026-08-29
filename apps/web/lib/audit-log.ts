import { createClient } from '@/lib/supabase/client'

type Accion = 'crear' | 'editar' | 'eliminar' | 'cambio_estado'
type Entidad = 'factura' | 'propiedad' | 'nomina' | 'alumno' | 'suscripcion'

export async function logAccion(
  accion: Accion,
  entidad: Entidad,
  entidadId: string | null,
  detalle?: string,
  meta?: Record<string, unknown>
) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: perfil } = await supabase
      .from('perfiles')
      .select('id')
      .eq('userId', user.id)
      .single()

    if (!perfil) return

    await supabase.from('audit_log').insert({
      id: crypto.randomUUID(),
      perfilId: perfil.id,
      accion,
      entidad,
      entidadId,
      detalle: detalle ?? null,
      meta: meta ? JSON.stringify(meta) : null,
    })
  } catch {
    // Silently fail — audit logging should never break the UI
  }
}
