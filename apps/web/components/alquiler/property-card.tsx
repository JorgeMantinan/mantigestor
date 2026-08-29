'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Building2, User, Trash2, Pencil, Plus } from 'lucide-react'
import { toast } from 'sonner'

const CATEGORIAS_GASTO = [
  { value: 'hipoteca', label: 'Hipoteca' },
  { value: 'comunidad', label: 'Comunidad' },
  { value: 'seguro', label: 'Seguro' },
  { value: 'ibi', label: 'IBI' },
  { value: 'derrama', label: 'Derrama' },
  { value: 'reparacion', label: 'Reparación' },
  { value: 'otros', label: 'Otros' },
] as const

interface Gasto {
  id: string
  concepto: string
  descripcion: string | null
  importe: number
  fecha: string
}

interface Propiedad {
  id: string
  direccion: string
  ingresos: number
  inquilinoNombre: string | null
  inquilinoEmail: string | null
  inquilinoTelefono: string | null
  gastos: Gasto[]
}

interface Props {
  propiedad: Propiedad
  editingId: string | null
  gastoPropiedadId: string | null
  guardando: boolean
  onEdit: (id: string, e: React.FormEvent<HTMLFormElement>) => void
  onDelete: (id: string) => void
  onAddGasto: (propiedadId: string, e: React.FormEvent<HTMLFormElement>) => void
  onDeleteGasto: (propiedadId: string, gastoId: string) => void
  setEditingId: (id: string | null) => void
  setGastoPropiedadId: (id: string | null) => void
}

export function PropertyCard({
  propiedad: p,
  editingId,
  gastoPropiedadId,
  guardando,
  onEdit,
  onDelete,
  onAddGasto,
  onDeleteGasto,
  setEditingId,
  setGastoPropiedadId,
}: Props) {
  const totalGasto = p.gastos.reduce((s, g) => s + g.importe, 0)
  const balance = p.ingresos - totalGasto

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <Building2 className="mt-1 h-8 w-8 text-primary" aria-hidden="true" />
            <div>
              <CardTitle className="text-lg">{p.direccion}</CardTitle>
              <CardDescription>Propiedad en alquiler</CardDescription>
            </div>
          </div>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" onClick={() => setEditingId(editingId === p.id ? null : p.id)} aria-label="Editar propiedad">
              <Pencil className="h-4 w-4" aria-hidden="true" />
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Eliminar propiedad">
                  <Trash2 className="h-4 w-4 text-destructive" aria-hidden="true" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>¿Eliminar propiedad?</AlertDialogTitle>
                  <AlertDialogDescription>Esta acción no se puede deshacer. Se eliminarán también todos sus gastos.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={() => onDelete(p.id)}>Eliminar</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-6 text-sm">
          <div>
            <span className="text-muted-foreground">Ingreso mensual</span>
            <p className="text-lg font-medium text-green-600">{(p.ingresos / 100).toFixed(2)} €</p>
          </div>
          <div>
            <span className="text-muted-foreground">Gastos totales</span>
            <p className="text-lg font-medium text-red-600">{(totalGasto / 100).toFixed(2)} €</p>
          </div>
          <div>
            <span className="text-muted-foreground">Balance mensual</span>
            <p className={`text-lg font-medium ${balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {(balance / 100).toFixed(2)} €
            </p>
          </div>
        </div>

        {p.inquilinoNombre && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <User className="h-4 w-4" aria-hidden="true" />
            <span>{p.inquilinoNombre}</span>
            {p.inquilinoEmail && <span>· {p.inquilinoEmail}</span>}
            {p.inquilinoTelefono && <span>· {p.inquilinoTelefono}</span>}
          </div>
        )}

        {editingId === p.id && (
          <form onSubmit={(e) => { e.preventDefault(); onEdit(p.id, e) }} className="space-y-4 rounded-lg border p-4">
            <p className="text-sm font-medium">Editar propiedad</p>
            <div className="space-y-2">
              <Label htmlFor="edit-ingresos">Ingreso mensual (€)</Label>
              <Input id="edit-ingresos" name="ingresos" type="number" step="0.01" min="0"
                defaultValue={p.ingresos / 100} />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="edit-inquilinoNombre">Nombre inquilino</Label>
                <Input id="edit-inquilinoNombre" name="inquilinoNombre" defaultValue={p.inquilinoNombre ?? ''} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-inquilinoEmail">Email</Label>
                <Input id="edit-inquilinoEmail" name="inquilinoEmail" defaultValue={p.inquilinoEmail ?? ''} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-inquilinoTelefono">Teléfono</Label>
                <Input id="edit-inquilinoTelefono" name="inquilinoTelefono" defaultValue={p.inquilinoTelefono ?? ''} />
              </div>
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={guardando}>{guardando ? 'Guardando...' : 'Guardar cambios'}</Button>
              <Button type="button" variant="outline" onClick={() => setEditingId(null)}>Cancelar</Button>
            </div>
          </form>
        )}

        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-medium">Gastos</p>
            <Button variant="outline" size="sm" onClick={() => setGastoPropiedadId(gastoPropiedadId === p.id ? null : p.id)}>
              <Plus className="mr-1 h-3 w-3" />
              Añadir gasto
            </Button>
          </div>

          {gastoPropiedadId === p.id && (
            <form onSubmit={(e) => { e.preventDefault(); onAddGasto(p.id, e) }} className="mb-4 grid gap-4 rounded-lg border p-4 sm:grid-cols-4">
              <div className="space-y-2">
                <Label htmlFor="concepto">Concepto</Label>
                <select id="concepto" name="concepto" required
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                  <option value="">Seleccionar...</option>
                  {CATEGORIAS_GASTO.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="importe">Importe (€)</Label>
                <Input id="importe" name="importe" type="number" step="0.01" min="0" required placeholder="0" />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="descripcion">Descripción (opcional)</Label>
                <Input id="descripcion" name="descripcion" placeholder="Recibo comunidad enero 2026" />
              </div>
              <div className="flex items-end gap-2 sm:col-span-4">
                <Button type="submit" disabled={guardando}>{guardando ? 'Guardando...' : 'Añadir'}</Button>
                <Button type="button" variant="outline" onClick={() => setGastoPropiedadId(null)}>Cancelar</Button>
              </div>
            </form>
          )}

          {p.gastos.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin gastos registrados</p>
          ) : (
            <div className="space-y-1">
              {p.gastos.map((g) => {
                const categoria = CATEGORIAS_GASTO.find((c) => c.value === g.concepto)
                return (
                  <div key={g.id} className="flex items-center justify-between rounded-md bg-muted/50 px-3 py-2 text-sm">
                    <div className="flex items-center gap-3">
                      <span className="font-medium">{categoria?.label ?? g.concepto}</span>
                      {g.descripcion && <span className="text-muted-foreground">· {g.descripcion}</span>}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-red-600">-{(g.importe / 100).toFixed(2)} €</span>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-6 w-6" aria-label="Eliminar gasto">
                            <Trash2 className="h-3 w-3 text-destructive" aria-hidden="true" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>¿Eliminar gasto?</AlertDialogTitle>
                            <AlertDialogDescription>Esta acción no se puede deshacer.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => onDeleteGasto(p.id, g.id)}>Eliminar</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
