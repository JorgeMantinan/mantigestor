'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Toaster, toast } from 'sonner'
import { useKeyboardShortcuts } from '@/hooks/use-keyboard-shortcuts'
import { Home, Plus, Search, Download } from 'lucide-react'
import { PropertyCard } from '@/components/alquiler/property-card'
import { descargarCsv } from '@/lib/descargar-csv'
import { descargarExcel } from '@/lib/descargar-excel'
import { logAccion } from '@/lib/audit-log'

type OrdenCampo = 'direccion' | 'ingresos' | 'gastos' | 'balance'
type OrdenDir = 'asc' | 'desc'

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
  const [busqueda, setBusqueda] = useState('')
  const [ordenCampo, setOrdenCampo] = useState<OrdenCampo>('direccion')
  const [ordenDir, setOrdenDir] = useState<OrdenDir>('asc')
  const searchRef = useRef<HTMLInputElement>(null)
  const getSupabase = useCallback(() => createClient(), [])

  useKeyboardShortcuts({
    onSearch: () => searchRef.current?.focus(),
    onNew: () => setShowForm(true),
    onEscape: () => setShowForm(false),
  })

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

  const totalGastos = (gastos: Gasto[]) => gastos.reduce((s, g) => s + g.importe, 0)

  const visibles = useMemo(() => {
    const term = busqueda.toLowerCase().trim()
    let filtradas = propiedades
    if (term) {
      filtradas = propiedades.filter((p) =>
        p.direccion.toLowerCase().includes(term) ||
        (p.inquilinoNombre?.toLowerCase().includes(term) ?? false)
      )
    }
    return [...filtradas].sort((a, b) => {
      let valA: number
      let valB: number
      switch (ordenCampo) {
        case 'direccion':
          return ordenDir === 'asc'
            ? a.direccion.localeCompare(b.direccion)
            : b.direccion.localeCompare(a.direccion)
        case 'ingresos':
          valA = a.ingresos
          valB = b.ingresos
          break
        case 'gastos':
          valA = totalGastos(a.gastos)
          valB = totalGastos(b.gastos)
          break
        case 'balance':
          valA = a.ingresos - totalGastos(a.gastos)
          valB = b.ingresos - totalGastos(b.gastos)
          break
      }
      return ordenDir === 'asc' ? valA - valB : valB - valA
    })
  }, [propiedades, busqueda, ordenCampo, ordenDir])

  const toggleOrden = (campo: OrdenCampo) => {
    if (ordenCampo === campo) {
      setOrdenDir(ordenDir === 'asc' ? 'desc' : 'asc')
    } else {
      setOrdenCampo(campo)
      setOrdenDir('asc')
    }
  }

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
      toast.success('Propiedad añadida')
    }
    setGuardando(false)
  }

  const handleEdit = async (id: string, e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
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
      .eq('id', id)

    if (!error) {
      setPropiedades(propiedades.map((p) =>
        p.id === id ? {
          ...p,
          ingresos: Math.round(parseFloat(form.get('ingresos') as string || '0') * 100),
          inquilinoNombre: (form.get('inquilinoNombre') as string)?.trim() || null,
          inquilinoEmail: (form.get('inquilinoEmail') as string)?.trim() || null,
          inquilinoTelefono: (form.get('inquilinoTelefono') as string)?.trim() || null,
        } : p
      ))
      setEditingId(null)
      toast.success('Propiedad actualizada')
    }
    setGuardando(false)
  }

  const handleDelete = async (id: string) => {
    const prop = propiedades.find(p => p.id === id)
    await getSupabase().from('propiedades_alquiler').delete().eq('id', id)
    await logAccion('eliminar', 'propiedad', id, `Propiedad ${prop?.direccion ?? ''} eliminada`)
    setPropiedades(propiedades.filter((p) => p.id !== id))
    toast.success('Propiedad eliminada')
  }

  const handleAddGasto = async (propiedadId: string, e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setGuardando(true)
    const form = new FormData(e.currentTarget)

    const { data, error } = await getSupabase().from('gastos_alquiler').insert({
      id: crypto.randomUUID(),
      propiedadId,
      concepto: form.get('concepto') as string,
      descripcion: (form.get('descripcion') as string)?.trim() || null,
      importe: Math.round(parseFloat(form.get('importe') as string || '0') * 100),
    }).select().single()

    if (!error && data) {
      setPropiedades(propiedades.map((p) =>
        p.id === propiedadId ? {
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
      toast.success('Gasto añadido')
    }
    setGuardando(false)
  }

  const handleDeleteGasto = async (propiedadId: string, gastoId: string) => {
    await getSupabase().from('gastos_alquiler').delete().eq('id', gastoId)
    setPropiedades(propiedades.map((p) =>
      p.id === propiedadId ? { ...p, gastos: p.gastos.filter((g) => g.id !== gastoId) } : p
    ))
    toast.success('Gasto eliminado')
  }

  if (cargando) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-9 w-40" />
            <Skeleton className="h-4 w-56" />
          </div>
          <Skeleton className="h-10 w-40" />
        </div>
        <Skeleton className="h-10 w-full max-w-md" />
        <div className="grid gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <Skeleton className="h-8 w-8 rounded" />
                    <div className="space-y-2">
                      <Skeleton className="h-5 w-48" />
                      <Skeleton className="h-4 w-32" />
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Skeleton className="h-8 w-8 rounded" />
                    <Skeleton className="h-8 w-8 rounded" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-6">
                  <Skeleton className="h-12 w-28" />
                  <Skeleton className="h-12 w-28" />
                  <Skeleton className="h-12 w-28" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Toaster position="top-right" richColors />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-heading font-bold tracking-tight">Alquiler</h1>
          <p className="text-muted-foreground">Gestión de propiedades en alquiler</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" disabled={visibles.length === 0}
            onClick={() => {
              const headers = ['Dirección', 'Inquilino', 'Ingresos', 'Gastos', 'Balance']
              const rows = visibles.map(p => [
                p.direccion, p.inquilinoNombre || 'Sin inquilino',
                p.ingresos.toFixed(2),
                p.gastos.reduce((s, g) => s + g.importe, 0).toFixed(2),
                (p.ingresos - p.gastos.reduce((s, g) => s + g.importe, 0)).toFixed(2)
              ])
              descargarExcel(headers, rows, `propiedades-alquiler-${new Date().toISOString().slice(0, 10)}.xlsx`, 'Propiedades')
            }}>
            <Download className="mr-1 h-4 w-4" /> Exportar Excel
          </Button>
          <Button onClick={() => setShowForm(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Añadir propiedad
          </Button>
        </div>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <Input
          ref={searchRef}
          placeholder="Buscar por dirección o inquilino..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="pl-9"
          aria-label="Buscar propiedades"
        />
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

      {propiedades.length > 0 && visibles.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-12">
            <Search className="h-12 w-12 text-muted-foreground" />
            <div className="text-center">
              <p className="font-medium">Sin resultados</p>
              <p className="text-sm text-muted-foreground">
                No se encontraron propiedades que coincidan con &quot;{busqueda}&quot;
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6">
        {visibles.map((p) => (
          <PropertyCard
            key={p.id}
            propiedad={p}
            editingId={editingId}
            gastoPropiedadId={gastoPropiedadId}
            guardando={guardando}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onAddGasto={handleAddGasto}
            onDeleteGasto={handleDeleteGasto}
            setEditingId={setEditingId}
            setGastoPropiedadId={setGastoPropiedadId}
          />
        ))}
      </div>
    </div>
  )
}
