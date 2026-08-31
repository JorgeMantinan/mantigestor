'use client'

import { useLanguage } from '@/contexts/language-context'
import { Globe } from 'lucide-react'

const LABELS: Record<string, string> = { es: 'ES', en: 'EN' }

export function LanguageSwitcher() {
  const { idioma, setIdioma } = useLanguage()

  return (
    <button
      onClick={() => setIdioma(idioma === 'es' ? 'en' : 'es')}
      className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
      aria-label={idioma === 'es' ? 'Switch to English' : 'Cambiar a español'}
    >
      <Globe className="h-4 w-4" aria-hidden="true" />
      <span className="text-xs font-medium">{LABELS[idioma]}</span>
    </button>
  )
}
