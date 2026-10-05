'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { PartyPopper } from 'lucide-react'

const STORAGE_KEY = 'milestone-100-seen'

export function MilestoneDialog() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (process.env.NEXT_PUBLIC_SHOW_MILESTONE !== '1') return
    const seen = localStorage.getItem(STORAGE_KEY)
    if (!seen) {
      const timer = setTimeout(() => setOpen(true), 2000)
      return () => clearTimeout(timer)
    }
  }, [])

  const handleClose = () => {
    setOpen(false)
    localStorage.setItem(STORAGE_KEY, '1')
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PartyPopper className="h-5 w-5 text-yellow-500" />
            ¡Hito 100!
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 text-center">
          <div className="text-6xl">🎉</div>
          <div>
            <h2 className="text-xl font-bold">100 prioridades completadas</h2>
            <p className="text-sm text-muted-foreground mt-2">
              MantiGestor ha alcanzado un hito increíble. Desde el primer modelo fiscal hasta el sistema multi-idioma,
              hemos construido juntos una aplicación completa de gestión fiscal.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-4 text-center text-sm">
            <div>
              <p className="text-2xl font-bold text-green-600">48</p>
              <p className="text-muted-foreground">Modelos fiscales</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-600">67+</p>
              <p className="text-muted-foreground">Rutas</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-purple-600">263</p>
              <p className="text-muted-foreground">Tests</p>
            </div>
          </div>
          <Button onClick={handleClose} className="w-full">
            ¡A seguir mejorando!
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )

  function handleOpenChange(value: boolean) {
    if (!value) handleClose()
  }
}
