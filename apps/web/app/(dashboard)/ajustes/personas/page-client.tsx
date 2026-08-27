'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Trash2, UserPlus, Users } from 'lucide-react'

type Persona = {
  perfilId: string
  nombre: string | null
  email: string
  rol: string
}

export function PersonasPageClient() {
  const [personas, setPersonas] = useState<Persona[]>([])
  const [cargando, setCargando] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [nuevoEmail, setNuevoEmail] = useState('')
  const [nuevoNombre, setNuevoNombre] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const [perfilAEliminar, setPerfilAEliminar] = useState<Persona | null>(null)

  const cargarPersonas = useCallback(async () => {
    try {
      const res = await fetch('/api/fiscal/mis-personas')
      const data = await res.json()
      setPersonas(data.personas ?? [])
    } catch {
      console.error('Error cargando personas')
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => {
    cargarPersonas()
  }, [cargarPersonas])

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
      setDialogOpen(false)
      setNuevoEmail('')
      setNuevoNombre('')
      setCargando(true)
      await cargarPersonas()
    } catch {
      setError('Error de red')
    } finally {
      setGuardando(false)
    }
  }

  const handleEliminar = async () => {
    if (!perfilAEliminar) return
    try {
      await fetch(`/api/fiscal/desasociar-persona?perfilId=${perfilAEliminar.perfilId}`, {
        method: 'DELETE',
      })
      setPersonas(prev => prev.filter(p => p.perfilId !== perfilAEliminar.perfilId))
    } catch {
      console.error('Error eliminando persona')
    } finally {
      setPerfilAEliminar(null)
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="text-3xl font-heading font-bold tracking-tight">Personas asociadas</h1>
        <p className="text-muted-foreground">Gestiona las personas cuyos asuntos fiscales gestionas</p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Personas</CardTitle>
            <CardDescription>Lista de personas asociadas a tu cuenta</CardDescription>
          </div>
          <Button size="sm" className="gap-2" onClick={() => setDialogOpen(true)}>
            <UserPlus className="h-4 w-4" />
            Asociar persona
          </Button>
        </CardHeader>
        <CardContent>
          {cargando ? (
            <div className="space-y-3">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : personas.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Users className="mb-4 h-12 w-12 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">No tienes personas asociadas</p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                Asocia personas para gestionar sus asuntos fiscales
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {personas.map(p => (
                <div
                  key={p.perfilId}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{p.nombre ?? 'Sin nombre'}</p>
                    <p className="text-xs text-muted-foreground truncate">{p.email}</p>
                  </div>
                  <div className="ml-4 flex items-center gap-3">
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium capitalize">
                      {p.rol}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setPerfilAEliminar(p)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Asociar nueva persona</DialogTitle>
            <DialogDescription>
              Introduce los datos de la persona cuyos asuntos fiscales quieres gestionar.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="asoc-nombre">Nombre</Label>
              <Input
                id="asoc-nombre"
                value={nuevoNombre}
                onChange={e => setNuevoNombre(e.target.value)}
                placeholder="María García"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="asoc-email">Email *</Label>
              <Input
                id="asoc-email"
                type="email"
                value={nuevoEmail}
                onChange={e => setNuevoEmail(e.target.value)}
                placeholder="maria@ejemplo.com"
                required
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAsociar} disabled={guardando || !nuevoEmail}>
              {guardando ? 'Guardando...' : 'Asociar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!perfilAEliminar} onOpenChange={(open) => !open && setPerfilAEliminar(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar persona</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que quieres eliminar a{' '}
              <strong>{perfilAEliminar?.nombre ?? perfilAEliminar?.email}</strong> de tus personas
              asociadas? Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleEliminar}>Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
