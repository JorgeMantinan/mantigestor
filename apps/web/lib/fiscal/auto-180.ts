import { createClient } from '@/lib/supabase/client'

interface PropiedadAlquiler {
  id: string
  direccion: string
  ingresos: number
  inquilinoNombre: string | null
  gastos_alquiler: Array<{ importe: number }>
}

export interface Resultado180Automatico {
  arrendamientos: Array<{
    direccion: string
    nifInquilino: string
    nombreInquilino: string
    rentasPercibidasCents: number
    tipoRetencionPct: number
    retencionCents: number
  }>
  totalRentas: number
  totalRetenciones: number
  numInquilinos: number
  numInmuebles: number
}

export async function generar180Automatico(
  perfilId: string,
  anyo: number
): Promise<Resultado180Automatico | null> {
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
    console.error('Error fetching propiedades for modelo 180:', propiedadesError)
    return null
  }

  if (!propiedades || propiedades.length === 0) return null

  const RETENCION_PCT = 19

  const arrendamientos = propiedades.map(p => {
    const gastosAnuales = (p.gastos_alquiler ?? []).reduce((sum, g) => sum + (g.importe ?? 0), 0)
    const rentasAnuales = Math.max(0, ((p.ingresos ?? 0) * 12) - gastosAnuales)
    const retencionCents = Math.round(rentasAnuales * (RETENCION_PCT / 100))
    return {
      direccion: p.direccion,
      nifInquilino: p.inquilinoNombre ?? '',
      nombreInquilino: p.inquilinoNombre ?? '',
      rentasPercibidasCents: rentasAnuales,
      tipoRetencionPct: RETENCION_PCT,
      retencionCents,
    }
  }).filter(a => a.rentasPercibidasCents > 0)

  if (arrendamientos.length === 0) return null

  const totalRentas = arrendamientos.reduce((sum, a) => sum + a.rentasPercibidasCents, 0)
  const totalRetenciones = arrendamientos.reduce((sum, a) => sum + a.retencionCents, 0)
  const uniqueInquilinos = new Set(arrendamientos.map(a => a.nifInquilino || a.nombreInquilino))

  return {
    arrendamientos,
    totalRentas,
    totalRetenciones,
    numInquilinos: uniqueInquilinos.size,
    numInmuebles: arrendamientos.length,
  }
}
