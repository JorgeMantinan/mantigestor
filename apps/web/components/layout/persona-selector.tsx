'use client'

import { useState } from 'react'
import { usePersonaActiva } from '@/contexts/persona-activa-context'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { Users, User, Check } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function PersonaSelector() {
  const { perfilActivoId, personas, cargando, setPerfilActivo, esPropio } = usePersonaActiva()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [nuevoEmail, setNuevoEmail] = useState('')
  const [nuevoNombre, setNuevoNombre] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const [invitationLink, setInvitationLink] = useState('')
  const [invitationSent, setInvitationSent] = useState(false)

  if (cargando) return null

  const personaActiva = personas.find(p => p.perfilId === perfilActivoId)

  const handleAsociar = async () => {
    setGuardando(true)
    setError('')
    try {
      const res = await fetch('/api/fiscal/asociar-persona', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: nuevoEmail, nombre: nuevoNombre }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Error al asociar')
        return
      }
      if (data.emailSent) {
        setDialogOpen(false)
        setNuevoEmail('')
        setNuevoNombre('')
        window.location.reload()
      } else {
        setInvitationLink(data.invitacionLink)
        setInvitationSent(true)
      }
    } catch {
      setError('Error de red')
    } finally {
      setGuardando(false)
    }
  }

  const handleDesasociar = async (pid: string) => {
    try {
      await fetch(`/api/fiscal/desasociar-persona?perfilId=${pid}`, { method: 'DELETE' })
      if (perfilActivoId === pid) setPerfilActivo(null)
      window.location.reload()
    } catch {
      // silent
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="gap-2 text-xs">
            <Users className="h-3.5 w-3.5" />
            {esPropio ? 'Mi perfil' : (personaActiva?.nombre ?? personaActiva?.email ?? 'Otra persona')}
            {!esPropio && <Badge variant="secondary" className="ml-1 text-[10px] px-1">Gestor</Badge>}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuLabel>Perfil activo</DropdownMenuLabel>
          <DropdownMenuItem onClick={() => setPerfilActivo(null)}>
            <User className="mr-2 h-4 w-4" />
            <div className="flex flex-col">
              <span className="text-sm">Mi perfil</span>
              <span className="text-xs text-muted-foreground">Tu cuenta personal</span>
            </div>
            {esPropio && <Check className="ml-auto h-4 w-4 text-primary" />}
          </DropdownMenuItem>
          {personas.length > 0 && <DropdownMenuSeparator />}
          {personas.map(p => (
            <DropdownMenuItem key={p.perfilId} onClick={() => setPerfilActivo(p.perfilId)}>
              <Users className="mr-2 h-4 w-4" />
              <div className="flex flex-col">
                <span className="text-sm">{p.nombre ?? p.email}</span>
                <span className="text-xs text-muted-foreground">{p.email} ({p.rol})</span>
              </div>
              {perfilActivoId === p.perfilId && <Check className="ml-auto h-4 w-4 text-primary" />}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setDialogOpen(true)}>
            <Users className="mr-2 h-4 w-4" />
            Asociar persona...
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) { setInvitationLink(''); setInvitationSent(false); } }}>
        <DialogContent>
          {invitationSent && invitationLink ? (
            <>
              <DialogHeader>
                <DialogTitle>Invitación creada</DialogTitle>
                <DialogDescription>
                  Comparte este enlace con la persona para que acepte la invitación.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="rounded-md border bg-muted p-3 text-sm break-all font-mono">
                  {invitationLink}
                </div>
                <p className="text-xs text-muted-foreground">
                  Copia este enlace y envíalo por WhatsApp, SMS o el medio que prefieras.
                </p>
              </div>
              <DialogFooter>
                <Button onClick={() => { navigator.clipboard.writeText(invitationLink); setDialogOpen(false); setInvitationLink(''); setInvitationSent(false); window.location.reload(); }}>
                  Copiar y cerrar
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Asociar nueva persona</DialogTitle>
                <DialogDescription>
                  Introduce los datos de la persona cuyos asuntos fiscales quieres gestionar.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="asoc-nombre">Nombre</Label>
                  <Input id="asoc-nombre" value={nuevoNombre} onChange={e => setNuevoNombre(e.target.value)} placeholder="María García" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="asoc-email">Email *</Label>
                  <Input id="asoc-email" type="email" value={nuevoEmail} onChange={e => setNuevoEmail(e.target.value)} placeholder="maria@ejemplo.com" required />
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
                <Button onClick={handleAsociar} disabled={guardando || !nuevoEmail}>
                  {guardando ? 'Guardando...' : 'Asociar'}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
