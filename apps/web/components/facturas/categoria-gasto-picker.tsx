'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Check, Tag, X } from 'lucide-react'
import { CATEGORIAS_GASTO } from '@mantigestor/utils'
import { cn } from '@/lib/utils'

interface CategoriaGastoPickerProps {
  value: string | null
  onChange: (value: string | null) => void
  className?: string
}

export function CategoriaGastoPicker({ value, onChange, className }: CategoriaGastoPickerProps) {
  const [abierto, setAbierto] = useState(false)
  const seleccionada = CATEGORIAS_GASTO.find(c => c.id === value)

  return (
    <div className={cn('relative', className)}>
      <Button variant="outline" size="sm" className="h-8 gap-1" onClick={() => setAbierto(!abierto)} type="button">
        {seleccionada ? (
          <>
            <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: seleccionada.color }} />
            {seleccionada.label}
          </>
        ) : (
          <>
            <Tag className="h-3 w-3" />
            Seleccionar categoría
          </>
        )}
        {value && (
          <X
            className="h-3 w-3 ml-1 text-muted-foreground hover:text-foreground"
            onClick={e => { e.stopPropagation(); onChange(null) }}
          />
        )}
      </Button>
      {abierto && (
        <div className="absolute z-50 mt-1 w-64 rounded-md border bg-popover p-2 shadow-md">
          {CATEGORIAS_GASTO.map(cat => (
            <button
              key={cat.id}
              type="button"
              className={cn(
                'flex items-center gap-2 w-full rounded-md px-2 py-1.5 text-sm text-left hover:bg-accent transition-colors',
                value === cat.id && 'bg-accent'
              )}
              onClick={() => { onChange(value === cat.id ? null : cat.id); setAbierto(false) }}
            >
              <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
              <span className="flex-1">{cat.label}</span>
              {value === cat.id && <Check className="h-3.5 w-3.5" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export function CategoriaBadge({ categoriaId, className }: { categoriaId: string | null; className?: string }) {
  const cat = CATEGORIAS_GASTO.find(c => c.id === categoriaId)
  if (!cat) return <Badge variant="outline" className={className}>Sin categoría</Badge>
  return (
    <Badge variant="outline" className={cn('gap-1', className)}>
      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: cat.color }} />
      {cat.label}
    </Badge>
  )
}
