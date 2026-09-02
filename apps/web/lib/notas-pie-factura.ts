import { createClient } from '@/lib/supabase/client'

export const NOTAS_PIE_PREDEFINIDAS: string[] = [
  'Pago a la vista. En caso de impago se devengarán intereses de demora según art. 34.2 LGT',
  'Exento de IVA según art. 20.1 LIVA (servicios de asesoría fiscal)',
  'IVA no sujeto art. 69 LIVA (operaciones intracomunitarias)',
  'Retención 15% IRPF (profesionales)',
  'Retención 21% IRPF (arrendamientos)',
]

export async function obtenerNotasPieDefecto(perfilId: string): Promise<string[]> {
  const supabase = createClient()
  const { data } = await supabase
    .from('perfiles')
    .select('notasPie')
    .eq('id', perfilId)
    .single()

  if (data?.notasPie) {
    return data.notasPie
      .split('\n')
      .map((n: string) => n.trim())
      .filter(Boolean)
  }
  return []
}

export async function guardarNotasPieDefecto(perfilId: string, notas: string[]): Promise<void> {
  const supabase = createClient()
  const notasPie = notas.filter(Boolean).join('\n') || null
  await supabase
    .from('perfiles')
    .update({ notasPie })
    .eq('id', perfilId)
}
