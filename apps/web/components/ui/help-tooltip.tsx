'use client'

import { useState, useRef, useEffect } from 'react'
import { CircleHelp, X } from 'lucide-react'

interface HelpTooltipProps {
  titulo: string
  contenido: string
  ejemplos?: string[]
  dondeVer?: string
}

export function HelpTooltip({ titulo, contenido, ejemplos, dondeVer }: HelpTooltipProps) {
  const [abierto, setAbierto] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!abierto) return
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setAbierto(false)
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') setAbierto(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [abierto])

  return (
    <span className="relative inline-flex" ref={ref}>
      <button
        type="button"
        onClick={() => setAbierto(!abierto)}
        className="inline-flex items-center justify-center h-5 w-5 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        aria-label={`Ayuda: ${titulo}`}
      >
        <CircleHelp className="h-3.5 w-3.5" aria-hidden="true" />
      </button>

      {abierto && (
        <div className="absolute z-50 mt-1 left-0 w-80 rounded-lg border bg-popover p-4 shadow-md text-sm">
          <div className="flex items-start justify-between gap-2 mb-2">
            <h4 className="font-semibold text-foreground leading-tight">{titulo}</h4>
            <button
              type="button"
              onClick={() => setAbierto(false)}
              className="shrink-0 rounded p-0.5 hover:bg-muted"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>

          <p className="text-muted-foreground leading-relaxed">{contenido}</p>

          {ejemplos && ejemplos.length > 0 && (
            <div className="mt-3 rounded-md bg-muted/50 p-2.5">
              <p className="text-xs font-medium text-foreground mb-1">Ejemplos:</p>
              <ul className="text-xs text-muted-foreground space-y-0.5 list-disc list-inside">
                {ejemplos.map((ej, i) => (
                  <li key={i}>{ej}</li>
                ))}
              </ul>
            </div>
          )}

          {dondeVer && (
            <p className="mt-2 text-xs text-muted-foreground">
              <span className="font-medium">Dónde encontrarlo:</span> {dondeVer}
            </p>
          )}
        </div>
      )}
    </span>
  )
}
