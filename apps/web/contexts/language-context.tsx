'use client'

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'
import { type Idioma, traducciones } from '@/lib/i18n'

interface LanguageContextType {
  idioma: Idioma
  setIdioma: (idioma: Idioma) => void
  t: (path: string) => string
}

const LanguageContext = createContext<LanguageContextType | null>(null)

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [idioma, setIdiomaState] = useState<Idioma>('es')

  useEffect(() => {
    const saved = localStorage.getItem('idioma') as Idioma | null
    if (saved === 'es' || saved === 'en' || saved === 'ca' || saved === 'gl' || saved === 'eu') setIdiomaState(saved)
  }, [])

  const setIdioma = useCallback((nuevo: Idioma) => {
    setIdiomaState(nuevo)
    localStorage.setItem('idioma', nuevo)
  }, [])

  const t = useCallback((path: string): string => {
    const keys = path.split('.')
    let result: unknown = traducciones[idioma]
    for (const key of keys) {
      if (result && typeof result === 'object' && key in result) {
        result = (result as Record<string, unknown>)[key]
      } else {
        return path
      }
    }
    return typeof result === 'string' ? result : path
  }, [idioma])

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
