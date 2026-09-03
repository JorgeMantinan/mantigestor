'use client'

import { createClient } from '@/lib/supabase/client'

export interface FirmaDigital {
  imagen: string
  nombre: string
  fecha: string
  cargo: string
}

export function generarFirmaBase64(canvas: HTMLCanvasElement): string {
  return canvas.toDataURL('image/png')
}

export async function guardarFirma(perfilId: string, firma: FirmaDigital): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('perfiles')
    .update({ firmaBase64: JSON.stringify(firma) })
    .eq('id', perfilId)

  if (error) throw error
}

export async function eliminarFirma(perfilId: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('perfiles')
    .update({ firmaBase64: null })
    .eq('id', perfilId)

  if (error) throw error
}

export async function obtenerFirma(perfilId: string): Promise<FirmaDigital | null> {
  const supabase = createClient()
  const { data } = await supabase
    .from('perfiles')
    .select('firmaBase64')
    .eq('id', perfilId)
    .single()

  if (!data?.firmaBase64) return null

  try {
    return JSON.parse(data.firmaBase64) as FirmaDigital
  } catch {
    return null
  }
}
