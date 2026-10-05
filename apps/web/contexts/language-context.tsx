'use client'

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'
import { type Idioma, type DeepTraducciones, cargarTraducciones, traduccionesDe, } from '@/lib/i18n'

interface LanguageContextType {
  idioma: Idioma
  setIdioma: (idioma: Idioma) => void
  t: (path: string) => string
}

const LanguageContext = createContext<LanguageContextType | null>(null)

function resolver(paquete: DeepTraducciones, path: string): string {
  const keys = path.split('.')
  let result: unknown = paquete
  for (const key of keys) {
    if (result && typeof result === 'object' && key in result) {
      result = (result as Record<string, unknown>)[key]
    } else {
      return path
    }
  }
  return typeof result === 'string' ? result : path
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [idioma, setIdiomaState] = useState<Idioma>('es')
  const [paquete, setPaquete] = useState<DeepTraducciones>(() => traduccionesDe('es'))

  useEffect(() => {
    const saved = localStorage.getItem('idioma') as Idioma | null
    const destino: Idioma =
      saved === 'en' || saved === 'ca' || saved === 'gl' || saved === 'eu' ? saved : 'es'
    setIdiomaState(destino)
    if (destino !== 'es') {
      void cargarTraducciones(destino).then(setPaquete)
    }
  }, [])

  const setIdioma = useCallback((nuevo: Idioma) => {
    setIdiomaState(nuevo)
    setPaquete(traduccionesDe(nuevo))
    localStorage.setItem('idioma', nuevo)
    if (traduccionesDe(nuevo) && nuevo !== 'es') {
      void cargarTraducciones(nuevo).then(setPaquete)
    }
  }, [])

  const t = useCallback(
    (path: string): string => {
      const resultado = resolver(paquete, path)
      // Fallback: si la clave no existe en el idioma activo, se intenta en 'es'
      // antes de devolver la clave literal (evita pintar 'grupo.clave' en pantalla)
      if (resultado !== path) return resultado
      return resolver(traduccionesDe('es'), path)
    },
    [paquete]
  )

  return (
    <LanguageContext.Provider value={{ idioma, setIdioma, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider')
  return ctx
}
