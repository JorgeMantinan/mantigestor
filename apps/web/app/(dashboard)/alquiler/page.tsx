'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Home, Plus, Building2, Euro, User, Trash2, Pencil } from 'lucide-react'

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

export default function AlquilerPage() {
  const [propiedades, setPropiedades] = useState<Propiedad[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [gastoPropiedadId, setGastoPropiedadId] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [cargando, setCargando] = useState(true)
  const getSupabase = useCallback(() => createClient(), [])

  const cargar = useCallback(async () => {
    const { data: { user } } = await getSupabase().auth.getUser()
    if (!user) { setCargando(false); return }

    const { data } = await getSupabase()
      .from('propiedades_alquiler')
      .select('*, gastos_alquiler(*)')
      .eq('perfilId', user.id)
      .order('createdAt', { ascending: false })

    setPropiedades((data ?? []).map((p: Record<string, unknown>) => ({
      id: p.id as string,
      direccion: p.direccion as string,
      ingresos: (p.ingresos as number) ?? 0,
      inquilinoNombre: (p.inquilinoNombre as string | null) ?? null,
      inquilinoEmail: (p.inquilinoEmail as string | null) ?? null,
      inquilinoTelefono: (p.inquilinoTelefono as string | null) ?? null,
      gastos: ((p.gastos_alquiler as Record<string, unknown>[]) ?? []).map((g) => ({
        id: g.id as string,
        concepto: g.concepto as string,
        descripcion: (g.descripcion as string | null) ?? null,
        importe: g.importe as number,
        fecha: g.fecha as string,
      })),
    })))
    setCargando(false)
  }, [getSupabase])

  useEffect(() => { cargar() }, [cargar])

  const handleAdd = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setGuardando(true)
    const form = new FormData(e.currentTarget)
    const { data: { user } } = await getSupabase().auth.getUser()
    if (!user) { setGuardando(false); return }

    const { data, error } = await getSupabase().from('propiedades_alquiler').insert({
      id: crypto.randomUUID(),
      perfilId: user.id,
      direccion: (form.get('direccion') as string)?.trim(),
      ingresos: Math.round(parseFloat(form.get('ingresos') as string || '0') * 100),
      inquilinoNombre: (form.get('inquilinoNombre') as string)?.trim() || null,
      inquilinoEmail: (form.get('inquilinoEmail') as string)?.trim() || null,
      inquilinoTelefono: (form.get('inquilinoTelefono') as string)?.trim() || null,
    }).select().single()

    if (!error && data) {
      setPropiedades([{
        id: data.id,
        direccion: data.direccion,
        ingresos: data.ingresos,
        inquilinoNombre: data.inquilinoNombre,
        inquilinoEmail: data.inquilinoEmail,
        inquilinoTelefono: data.inquilinoTelefono,
        gastos: [],
      }, ...propiedades])
      setShowForm(false)
    }
    setGuardando(false)
  }

  const handleEdit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!editingId) return
    setGuardando(true)
    const form = new FormData(e.currentTarget)

    const { error } = await getSupabase()
      .from('propiedades_alquiler')
      .update({
        ingresos: Math.round(parseFloat(form.get('ingresos') as string || '0') * 100),
        inquilinoNombre: (form.get('inquilinoNombre') as string)?.trim() || null,
        inquilinoEmail: (form.get('inquilinoEmail') as string)?.trim() || null,
        inquilinoTelefono: (form.get('inquilinoTelefono') as string)?.trim() || null,
      })
      .eq('id', editingId)

    if (!error) {
      setPropiedades(propiedades.map((p) =>
        p.id === editingId ? {
          ...p,
          ingresos: Math.round(parseFloat(form.get('ingresos') as string || '0') * 100),
          inquilinoNombre: (form.get('inquilinoNombre') as string)?.trim() || null,
          inquilinoEmail: (form.get('inquilinoEmail') as string)?.trim() || null,
          inquilinoTelefono: (form.get('inquilinoTelefono') as string)?.trim() || null,
        } : p
      ))
      setEditingId(null)
    }
    setGuardando(false)
  }

  const handleDelete = async (id: string) => {
    await getSupabase().from('propiedades_alquiler').delete().eq('id', id)
    setPropiedades(propiedades.filter((p) => p.id !== id))
  }

  const handleAddGasto = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!gastoPropiedadId) return
    setGuardando(true)
    const form = new FormData(e.currentTarget)

    const { data, error } = await getSupabase().from('gastos_alquiler').insert({
      id: crypto.randomUUID(),
      propiedadId: gastoPropiedadId,
      concepto: form.get('concepto') as string,
      descripcion: (form.get('descripcion') as string)?.trim() || null,
      importe: Math.round(parseFloat(form.get('importe') as string || '0') * 100),
    }).select().single()

    if (!error && data) {
      setPropiedades(propiedades.map((p) =>
        p.id === gastoPropiedadId ? {
          ...p,
          gastos: [...p.gastos, {
            id: data.id,
            concepto: data.concepto,
            descripcion: data.descripcion,
            importe: data.importe,
            fecha: data.fecha,
          }],
        } : p
      ))
      setGastoPropiedadId(null)
    }
    setGuardando(false)
  }

  const handleDeleteGasto = async (propiedadId: string, gastoId: string) => {
    await getSupabase().from('gastos_alquiler').delete().eq('id', gastoId)
    setPropiedades(propiedades.map((p) =>
      p.id === propiedadId ? { ...p, gastos: p.gastos.filter((g) => g.id !== gastoId) } : p
    ))
  }

  const totalGastos = (gastos: Gasto[]) => gastos.reduce((s, g) => s + g.importe, 0)

  if (cargando) {
    return <p className="text-muted-foreground">Cargando propiedades...</p>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-heading font-bold tracking-tight">Alquiler</h1>
          <p className="text-muted-foreground">Gestión de propiedades en alquiler</p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Añadir propiedad
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>Nueva propiedad</CardTitle>
            <CardDescription>Datos del inmueble y del inquilino</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAdd} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="direccion">Dirección *</Label>
                <Input id="direccion" name="direccion" required placeholder="Calle Mayor 1, Madrid" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ingresos">Ingreso mensual (€)</Label>
                <Input id="ingresos" name="ingresos" type="number" step="0.01" min="0" placeholder="800" />
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="inquilinoNombre">Nombre del inquilino (opcional)</Label>
                  <Input id="inquilinoNombre" name="inquilinoNombre" placeholder="María García" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="inquilinoEmail">Email (opcional)</Label>
                  <Input id="inquilinoEmail" name="inquilinoEmail" type="email" placeholder="maria@email.com" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="inquilinoTelefono">Teléfono (opcional)</Label>
                  <Input id="inquilinoTelefono" name="inquilinoTelefono" type="tel" placeholder="612 345 678" />
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={guardando}>{guardando ? 'Guardando...' : 'Guardar'}</Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {propiedades.length === 0 && !showForm && (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-12">
            <Home className="h-12 w-12 text-muted-foreground" />
            <div className="text-center">
              <p className="font-medium">No hay propiedades</p>
              <p className="text-sm text-muted-foreground">
                Añade tus propiedades en alquiler para controlar ingresos y gastos
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6">
        {propiedades.map((p) => {
          const totalGasto = totalGastos(p.gastos)
          const balance = p.ingresos - totalGasto

          return (
            <Card key={p.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <Building2 className="mt-1 h-8 w-8 text-primary" />
                    <div>
                      <CardTitle className="text-lg">{p.direccion}</CardTitle>
                      <CardDescription>Propiedad en alquiler</CardDescription>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => setEditingId(editingId === p.id ? null : p.id)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(p.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
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
                    <User className="h-4 w-4" />
                    <span>{p.inquilinoNombre}</span>
                    {p.inquilinoEmail && <span>· {p.inquilinoEmail}</span>}
                    {p.inquilinoTelefono && <span>· {p.inquilinoTelefono}</span>}
                  </div>
                )}

                {editingId === p.id && (
                  <form onSubmit={handleEdit} className="space-y-4 rounded-lg border p-4">
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
                    <form onSubmit={handleAddGasto} className="mb-4 grid gap-4 rounded-lg border p-4 sm:grid-cols-4">
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
                              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleDeleteGasto(p.id, g.id)}>
                                <Trash2 className="h-3 w-3 text-destructive" />
                              </Button>
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
        })}
      </div>
    </div>
  )
}
