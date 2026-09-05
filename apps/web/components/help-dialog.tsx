'use client'

import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Kbd } from '@/components/ui/kbd'
import { Keyboard, ExternalLink } from 'lucide-react'
import { useLanguage } from '@/contexts/language-context'

export function HelpDialog() {
  const [open, setOpen] = useState(false)
  const { t } = useLanguage()

  const shortcuts = [
    { keys: ['Ctrl', 'K'], description: t('helpDialog.busquedaGlobal') },
    { keys: ['/'], description: t('helpDialog.buscarPaginaActual') },
    { keys: ['Ctrl', 'N'], description: t('helpDialog.crearNuevo') },
    { keys: ['Esc'], description: t('helpDialog.cerrarCancelar') },
    { keys: ['?'], description: t('helpDialog.mostrarAyuda') },
    { keys: ['G', 'F'], description: t('helpDialog.irFacturas') },
    { keys: ['G', 'D'], description: t('helpDialog.irDashboard') },
    { keys: ['G', 'A'], description: t('helpDialog.irAlquiler') },
    { keys: ['G', 'N'], description: t('helpDialog.irNominas') },
    { keys: ['Ctrl', 'E'], description: t('helpDialog.exportarExcel') },
    { keys: ['Ctrl', 'P'], description: t('helpDialog.exportarPdf') },
    { keys: ['F'], description: t('helpDialog.buscarFacturas') },
    { keys: ['E'], description: t('helpDialog.filtrarEstado') },
    { keys: ['T'], description: t('helpDialog.filtrarTipo') },
  ]

  const links = [
    { label: t('helpDialog.documentacion'), href: 'https://docs.mantigestor.com' },
    { label: t('helpDialog.soporte'), href: 'mailto:soporte@mantigestor.com' },
    { label: 'Changelog', href: 'https://github.com/JorgeMantinan/mantigestor/releases' },
  ]

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
            {t('helpDialog.atajosTeclado')}
          </DialogTitle>
          <DialogDescription>
            {t('helpDialog.referenciaRapida')}
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
          <p className="text-xs font-medium text-muted-foreground mb-2">{t('helpDialog.enlaces')}</p>
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
