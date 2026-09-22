'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { usePersonaActiva } from '@/contexts/persona-activa-context'

interface ModuloIndicadorProps {
  entidad: string
}

export function ModuloIndicador({ entidad }: ModuloIndicadorProps) {
  const [modificado, setModificado] = useState(false)
  const { perfilActivoId } = usePersonaActiva()

  useEffect(() => {
    const supabase = createClient()

    const check = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        let perfilId = perfilActivoId
        if (!perfilId) {
          const { data: perfil } = await supabase
            .from('perfiles')
            .select('id')
            .eq('userId', user.id)
            .single()
          if (!perfil) return
          perfilId = perfil.id
        }

        const { data } = await supabase
          .from('versiones_registro')
          .select('id')
          .eq('perfilId', perfilId)
          .eq('entidad', entidad)
          .order('createdAt', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (data) {
          const hace24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
          const { count } = await supabase
            .from('versiones_registro')
            .select('id', { count: 'exact', head: true })
            .eq('perfilId', perfilId)
            .eq('entidad', entidad)
            .gte('createdAt', hace24h)
          setModificado((count ?? 0) > 0)
        }
      } catch {
        // Silently fail
      }
    }

    void check()
  }, [perfilActivoId, entidad])

  if (!modificado) return null

  return (
    <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-blue-500" aria-label="Modificado recientemente" />
  )
}
