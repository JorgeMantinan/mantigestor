'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

export function CollapsibleSection({
  titulo,
  defaultAbierto = false,
  children,
}: {
  titulo: string
  defaultAbierto?: boolean
  children: React.ReactNode
}) {
  const [abierto, setAbierto] = useState(defaultAbierto)

  return (
    <div className="rounded-lg border">
      <button
        type="button"
        onClick={() => setAbierto(prev => !prev)}
        className="flex w-full items-center justify-between px-4 py-2 text-sm font-medium hover:bg-muted/50 transition-colors"
        aria-expanded={abierto}
      >
        {titulo}
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 ${abierto ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
      </button>
      {abierto && (
        <div className="border-t px-4 py-3">
          {children}
        </div>
      )}
    </div>
  )
}
