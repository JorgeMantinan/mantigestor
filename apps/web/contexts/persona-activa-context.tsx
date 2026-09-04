'use client'

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'

export interface PersonaAsociada {
  perfilId: string
  nombre: string | null
  email: string
  rol: string
  tipo?: 'gestiono' | 'me_gestiona'
}

interface PersonaActivaState {
  perfilActivoId: string | null  // null = propio
  personas: PersonaAsociada[]
  cargando: boolean
  setPerfilActivo: (perfilId: string | null) => void
  esPropio: boolean
}

const PersonaActivaContext = createContext<PersonaActivaState>({
  perfilActivoId: null,
  personas: [],
  cargando: true,
  setPerfilActivo: () => {},
  esPropio: true,
})

export function PersonaActivaProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [perfilActivoId, setPerfilActivoState] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      const match = document.cookie.match(/perfilActivoId=([^;]+)/)
      return match?.[1] ?? null
    }
    return null
  })
  const [personas, setPersonas] = useState<PersonaAsociada[]>([])
  const [cargando, setCargando] = useState(true)

  // Cargar personas asociadas
  useEffect(() => {
    if (!user) {
      setPersonas([])
      setCargando(false)
      return
    }

    const supabase = createClient()

    async function cargarPersonas() {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) return

        const res = await fetch('/api/fiscal/mis-personas', {
          headers: { Authorization: `Bearer ${session.access_token}` },
        })
        if (res.ok) {
          const data = await res.json()
          setPersonas(data.personas ?? [])
        }
      } catch {
        // Silenciar errores de red
      } finally {
        setCargando(false)
      }
    }

    cargarPersonas()
  }, [user])

  const setPerfilActivo = useCallback((perfilId: string | null) => {
    // Guardar en cookie para que middleware lo lea
    if (perfilId) {
      document.cookie = `perfilActivoId=${perfilId}; path=/; max-age=31536000; SameSite=Lax`
    } else {
      document.cookie = 'perfilActivoId=; path=/; max-age=0'
    }
    setPerfilActivoState(perfilId)
    window.location.reload()
  }, [])

  const esPropio = perfilActivoId === null

  return (
    <PersonaActivaContext.Provider
      value={{ perfilActivoId, personas, cargando, setPerfilActivo, esPropio }}
    >
      {children}
    </PersonaActivaContext.Provider>
  )
}

export function usePersonaActiva() {
  return useContext(PersonaActivaContext)
}
