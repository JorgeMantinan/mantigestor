import { createClient } from '@/lib/supabase/client'

interface PropiedadAlquiler {
  id: string
  direccion: string
  ingresos: number
  inquilinoNombre: string | null
  inquilinoNif: string | null
  gastos_alquiler: Array<{ importe: number }>
}

export interface Resultado115Automatico {
  inmuebles: Array<{
    direccion: string
    nifArrendatario: string
    baseImponible: number
    retencionPct: number
  }>
  totalBaseImponible: number
  totalRetenciones: number
  numInmuebles: number
}

export async function generar115Automatico(
  perfilId: string,
  trimestre: 1 | 2 | 3 | 4,
  anyo: number
): Promise<Resultado115Automatico | null> {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: perfil, error: perfilError } = await supabase
    .from('perfiles')
    .select('userId')
    .eq('id', perfilId)
    .single()

  if (perfilError || !perfil || perfil.userId !== user.id) return null

  const { data: propiedades, error: propiedadesError } = await supabase
    .from('propiedades_alquiler')
    .select('*, gastos_alquiler(*)')
    .eq('perfilId', perfilId) as { data: PropiedadAlquiler[] | null; error: unknown }

  if (propiedadesError) {
    console.error('Error fetching propiedades for modelo 115:', propiedadesError)
    return null
  }

  if (!propiedades || propiedades.length === 0) return null

  const RETENCION_PCT = 19

  const inmuebles = propiedades.map(p => {
    const gastosTrim = (p.gastos_alquiler ?? []).reduce((sum, g) => sum + (g.importe ?? 0), 0)
    const rentaTrim = Math.max(0, (p.ingresos ?? 0) - gastosTrim)
    return {
      direccion: p.direccion,
      nifArrendatario: p.inquilinoNif ?? '',
      baseImponible: rentaTrim,
      retencionPct: RETENCION_PCT,
    }
  }).filter(inm => inm.baseImponible > 0)

  if (inmuebles.length === 0) return null

  const totalBaseImponible = inmuebles.reduce((sum, inm) => sum + inm.baseImponible, 0)
  const totalRetenciones = inmuebles.reduce((sum, inm) => sum + Math.round(inm.baseImponible * (inm.retencionPct / 100)), 0)

  return {
    inmuebles,
    totalBaseImponible,
    totalRetenciones,
    numInmuebles: inmuebles.length,
  }
}
