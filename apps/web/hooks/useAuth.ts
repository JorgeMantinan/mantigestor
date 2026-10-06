'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { purgarDatosPrivados } from '@/lib/purgar-datos'
import type { User } from '@supabase/supabase-js'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [cargando, setCargando] = useState(true)
  const teniaSesion = useRef(false)

  useEffect(() => {
    const supabase = createClient()

    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
      setCargando(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null)
        if (session) {
          teniaSesion.current = true
        } else if (teniaSesion.current) {
          // La sesión desapareció (expiración o revocación): purgar los datos
          // cacheados — si no, sobreviven en un equipo compartido
          teniaSesion.current = false
          void purgarDatosPrivados()
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  return { user, cargando }
}
