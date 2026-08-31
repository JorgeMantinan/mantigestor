'use client'

import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Kbd } from '@/components/ui/kbd'
import { Keyboard, ExternalLink } from 'lucide-react'

const shortcuts = [
  { keys: ['Ctrl', 'K'], description: 'Búsqueda global' },
  { keys: ['/'], description: 'Buscar en la página actual' },
  { keys: ['Ctrl', 'N'], description: 'Crear nuevo registro' },
  { keys: ['Esc'], description: 'Cerrar panel / cancelar' },
  { keys: ['?'], description: 'Mostrar esta ayuda' },
  { keys: ['G', 'F'], description: 'Ir a Facturas' },
  { keys: ['G', 'D'], description: 'Ir a Dashboard' },
  { keys: ['G', 'A'], description: 'Ir a Alquiler' },
  { keys: ['G', 'N'], description: 'Ir a Nóminas' },
  { keys: ['Ctrl', 'E'], description: 'Exportar Excel' },
  { keys: ['Ctrl', 'P'], description: 'Exportar PDF' },
]

const links = [
  { label: 'Documentación', href: 'https://docs.mantigestor.com' },
  { label: 'Soporte', href: 'mailto:soporte@mantigestor.com' },
  { label: 'Changelog', href: 'https://github.com/JorgeMantinan/mantigestor/releases' },
]

export function HelpDialog() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === '?' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const target = e.target as HTMLElement
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return
        e.preventDefault()
        setOpen(prev => !prev)
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5" aria-hidden="true" />
            Atajos de teclado
          </DialogTitle>
          <DialogDescription>
            Referencia rápida de atajos disponibles en MantiGestor
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {shortcuts.map((s, i) => (
            <div key={i} className="flex items-center justify-between">
              <span className="text-sm">{s.description}</span>
              <div className="flex items-center gap-1">
                {s.keys.map((k, j) => (
                  <span key={j} className="flex items-center gap-1">
                    {j > 0 && <span className="text-xs text-muted-foreground">+</span>}
                    <Kbd>{k}</Kbd>
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="border-t pt-4 mt-2">
          <p className="text-xs font-medium text-muted-foreground mb-2">Enlaces</p>
          <div className="flex flex-wrap gap-2">
            {links.map(l => (
              <a key={l.href} href={l.href} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
                {l.label} <ExternalLink className="h-3 w-3" />
              </a>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
