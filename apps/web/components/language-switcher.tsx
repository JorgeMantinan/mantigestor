'use client'

import { useLanguage } from '@/contexts/language-context'
import { Globe } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'

const LABELS: Record<string, string> = { es: 'ES', en: 'EN' }
const NAMES: Record<string, string> = { es: 'Español', en: 'English' }
const ORDER: string[] = ['es', 'en']

export function LanguageSwitcher() {
  const { idioma, setIdioma } = useLanguage()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex h-8 shrink-0 items-center gap-1.5 rounded-md px-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
        aria-label="Cambiar idioma"
        aria-expanded={open}
      >
        <Globe className="h-4 w-4" aria-hidden="true" />
        <span className="hidden text-xs font-medium sm:inline">{LABELS[idioma]}</span>
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 w-36 rounded-md border bg-popover p-1 shadow-md">
          {ORDER.map((code) => (
            <button
              key={code}
              onClick={() => { setIdioma(code as 'es' | 'en'); setOpen(false) }}
              className={`flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm transition-colors ${
                idioma === code ? 'bg-accent text-accent-foreground font-medium' : 'hover:bg-accent/50'
              }`}
            >
              <span className="text-xs font-mono text-muted-foreground">{LABELS[code]}</span>
              <span>{NAMES[code]}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
