import { createClient } from '@/lib/supabase/client'

interface PropiedadAlquiler {
  id: string
  direccion: string
  ingresos: number
  inquilinoNombre: string | null
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

  const { data: propiedades } = await supabase
    .from('propiedades_alquiler')
    .select('*, gastos_alquiler(*)')
    .eq('perfilId', perfilId) as { data: PropiedadAlquiler[] | null }

  if (!propiedades || propiedades.length === 0) return null

  const RETENCION_PCT = 19

  const inmuebles = propiedades.map(p => {
    const gastosTrim = (p.gastos_alquiler ?? []).reduce((sum, g) => sum + (g.importe ?? 0), 0)
    const rentaTrim = Math.max(0, (p.ingresos ?? 0) - gastosTrim)
    return {
      direccion: p.direccion,
      nifArrendatario: p.inquilinoNombre ?? '',
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
