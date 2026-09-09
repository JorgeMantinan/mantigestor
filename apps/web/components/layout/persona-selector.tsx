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
import { useLanguage } from '@/contexts/language-context'

export function PersonaSelector() {
  const { perfilActivoId, personas, cargando, setPerfilActivo, esPropio } = usePersonaActiva()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [nuevoEmail, setNuevoEmail] = useState('')
  const [nuevoNombre, setNuevoNombre] = useState('')
  const [nuevoRol, setNuevoRol] = useState<'gestor' | 'visualizador'>('gestor')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const [invitationLink, setInvitationLink] = useState('')
  const [invitationSent, setInvitationSent] = useState(false)
  const { t } = useLanguage()

  if (cargando) return null

  const personaActiva = personas.find(p => p.perfilId === perfilActivoId)

  const handleAsociar = async () => {
    setGuardando(true)
    setError('')
    try {
      const res = await fetch('/api/fiscal/asociar-persona', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: nuevoEmail, nombre: nuevoNombre, rol: nuevoRol }),
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
        setNuevoRol('gestor')
        window.location.reload()
      } else {
        setInvitationLink(data.confirmacionLink || data.invitacionLink)
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
            {esPropio ? t('personaSelector.miPerfil') : (personaActiva?.nombre ?? personaActiva?.email ?? t('personaSelector.otraPersona'))}
            {!esPropio && <Badge variant="secondary" className="ml-1 text-[10px] px-1">{t('personaSelector.gestor')}</Badge>}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuLabel>{t('personaSelector.perfilActivo')}</DropdownMenuLabel>
          <DropdownMenuItem onClick={() => setPerfilActivo(null)}>
            <User className="mr-2 h-4 w-4" />
            <div className="flex flex-col">
              <span className="text-sm">{t('personaSelector.miPerfil')}</span>
              <span className="text-xs text-muted-foreground">{t('personaSelector.tuCuentaPersonal')}</span>
            </div>
            {esPropio && <Check className="ml-auto h-4 w-4 text-primary" />}
          </DropdownMenuItem>
          {personas.length > 0 && <DropdownMenuSeparator />}
              {personas.map(p => (
            <DropdownMenuItem
              key={p.perfilId}
              onClick={() => p.tipo !== 'me_gestiona' && setPerfilActivo(p.perfilId)}
              className={p.tipo === 'me_gestiona' ? 'opacity-60 cursor-default' : 'cursor-pointer'}
            >
              <Users className="mr-2 h-4 w-4" />
              <div className="flex flex-col">
                <span className="text-sm">{p.nombre || t('personaSelector.sinNombre')}</span>
                <span className="text-xs text-muted-foreground">
                  {p.email} {p.tipo === 'me_gestiona' ? t('personaSelector.teGestiona') : t('personaSelector.gestionas')}
                </span>
              </div>
              {perfilActivoId === p.perfilId && <Check className="ml-auto h-4 w-4 text-primary" />}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setDialogOpen(true)}>
            <Users className="mr-2 h-4 w-4" />
            {t('personaSelector.asociarPersona')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) { setInvitationLink(''); setInvitationSent(false); setNuevoRol('gestor'); } }}>
        <DialogContent>
          {invitationSent && invitationLink ? (
            <>
              <DialogHeader>
                <DialogTitle>{t('personaSelector.invitacionCreada')}</DialogTitle>
                <DialogDescription>
                  {t('personaSelector.comparteEnlace')}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="rounded-md border bg-muted p-3 text-sm break-all font-mono">
                  {invitationLink}
                </div>
                <p className="text-xs text-muted-foreground">
                  {t('personaSelector.copiaEnlace')}
                </p>
              </div>
              <DialogFooter>
                <Button onClick={() => { navigator.clipboard.writeText(invitationLink); setDialogOpen(false); setInvitationLink(''); setInvitationSent(false); window.location.reload(); }}>
                  {t('personaSelector.copiarCerrar')}
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>{t('personaSelector.asociarNueva')}</DialogTitle>
                <DialogDescription>
                  {t('personaSelector.introduceDatos')}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="asoc-nombre">{t('personaSelector.nombre')}</Label>
                  <Input id="asoc-nombre" value={nuevoNombre} onChange={e => setNuevoNombre(e.target.value)} placeholder="María García" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="asoc-email">{t('personaSelector.email')}</Label>
                  <Input id="asoc-email" type="email" value={nuevoEmail} onChange={e => setNuevoEmail(e.target.value)} placeholder="maria@ejemplo.com" required />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="asoc-rol">{t('personaSelector.rol')}</Label>
                  <select
                    id="asoc-rol"
                    value={nuevoRol}
                    onChange={e => setNuevoRol(e.target.value as 'gestor' | 'visualizador')}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <option value="gestor">{t('personaSelector.rolGestor')}</option>
                    <option value="visualizador">{t('personaSelector.rolVisualizador')}</option>
                  </select>
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>{t('personaSelector.cancelar')}</Button>
                <Button onClick={handleAsociar} disabled={guardando || !nuevoEmail}>
                  {guardando ? t('personaSelector.guardando') : t('personaSelector.asociar')}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
