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
import { useLanguage } from '@/contexts/language-context'
import { useEmpresaActiva } from '@/contexts/empresa-activa-context'
import { usePersonaActiva } from '@/contexts/persona-activa-context'
import { esSoloLectura } from '@/lib/resolve-perfil-activo'

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
  fechaInicioContrato: string | null
  duracionContratoMeses: number | null
  proximaRevision: string | null
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
  const { t } = useLanguage()
  const { empresaActiva } = useEmpresaActiva()
  const { perfilActivoId, personas, esPropio } = usePersonaActiva()
  const personaActiva = personas.find(p => p.perfilId === perfilActivoId)
  const soloLectura = !esPropio && personaActiva && esSoloLectura(personaActiva.rol)

  useKeyboardShortcuts({
    onSearch: () => searchRef.current?.focus(),
    onNew: () => !soloLectura && setShowForm(true),
    onEscape: () => setShowForm(false),
  })

  const cargar = useCallback(async () => {
    const { data: { user } } = await getSupabase().auth.getUser()
    if (!user) { setCargando(false); return }

    let query = getSupabase()
      .from('propiedades_alquiler')
      .select('*, gastos_alquiler(*)')
      .eq('perfilId', perfilActivoId ?? user.id)
      .order('createdAt', { ascending: false })
    if (empresaActiva?.id) {
      query = query.eq('empresaId', empresaActiva.id)
    }

    const { data } = await query

    setPropiedades((data ?? []).map((p: Record<string, unknown>) => ({
      id: p.id as string,
      direccion: p.direccion as string,
      ingresos: (p.ingresos as number) ?? 0,
      inquilinoNombre: (p.inquilinoNombre as string | null) ?? null,
      inquilinoEmail: (p.inquilinoEmail as string | null) ?? null,
      inquilinoTelefono: (p.inquilinoTelefono as string | null) ?? null,
      fechaInicioContrato: (p.fechaInicioContrato as string | null) ?? null,
      duracionContratoMeses: (p.duracionContratoMeses as number | null) ?? null,
      proximaRevision: (p.proximaRevision as string | null) ?? null,
      gastos: ((p.gastos_alquiler as Record<string, unknown>[]) ?? []).map((g) => ({
        id: g.id as string,
        concepto: g.concepto as string,
        descripcion: (g.descripcion as string | null) ?? null,
        importe: g.importe as number,
        fecha: g.fecha as string,
      })),
    })))
    setCargando(false)
  }, [getSupabase, empresaActiva?.id, perfilActivoId])

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
      perfilId: perfilActivoId ?? user.id,
      direccion: (form.get('direccion') as string)?.trim(),
      ingresos: Math.round(parseFloat(form.get('ingresos') as string || '0') * 100),
      inquilinoNombre: (form.get('inquilinoNombre') as string)?.trim() || null,
      inquilinoEmail: (form.get('inquilinoEmail') as string)?.trim() || null,
      inquilinoTelefono: (form.get('inquilinoTelefono') as string)?.trim() || null,
      fechaInicioContrato: (form.get('fechaInicioContrato') as string) || null,
      duracionContratoMeses: form.get('duracionContratoMeses') ? parseInt(form.get('duracionContratoMeses') as string) : null,
      proximaRevision: (form.get('proximaRevision') as string) || null,
    }).select().single()

    if (!error && data) {
      setPropiedades([{
        id: data.id,
        direccion: data.direccion,
        ingresos: data.ingresos,
        inquilinoNombre: data.inquilinoNombre,
        inquilinoEmail: data.inquilinoEmail,
        inquilinoTelefono: data.inquilinoTelefono,
        fechaInicioContrato: data.fechaInicioContrato ?? null,
        duracionContratoMeses: data.duracionContratoMeses ?? null,
        proximaRevision: data.proximaRevision ?? null,
        gastos: [],
      }, ...propiedades])
      setShowForm(false)
      toast.success(t('alquiler.propiedadAnyadida'))
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
        fechaInicioContrato: (form.get('fechaInicioContrato') as string) || null,
        duracionContratoMeses: form.get('duracionContratoMeses') ? parseInt(form.get('duracionContratoMeses') as string) : null,
        proximaRevision: (form.get('proximaRevision') as string) || null,
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
          fechaInicioContrato: (form.get('fechaInicioContrato') as string) || null,
          duracionContratoMeses: form.get('duracionContratoMeses') ? parseInt(form.get('duracionContratoMeses') as string) : null,
          proximaRevision: (form.get('proximaRevision') as string) || null,
        } : p
      ))
      setEditingId(null)
      toast.success(t('alquiler.propiedadActualizada'))
    }
    setGuardando(false)
  }

  const handleDelete = async (id: string) => {
    const prop = propiedades.find(p => p.id === id)
    await getSupabase().from('propiedades_alquiler').delete().eq('id', id)
    await logAccion('eliminar', 'propiedad', id, `Propiedad ${prop?.direccion ?? ''} eliminada`)
    setPropiedades(propiedades.filter((p) => p.id !== id))
    toast.success(t('alquiler.propiedadEliminada'))
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
      toast.success(t('alquiler.gastoAnyadido'))
    }
    setGuardando(false)
  }

  const handleDeleteGasto = async (propiedadId: string, gastoId: string) => {
    await getSupabase().from('gastos_alquiler').delete().eq('id', gastoId)
    setPropiedades(propiedades.map((p) =>
      p.id === propiedadId ? { ...p, gastos: p.gastos.filter((g) => g.id !== gastoId) } : p
    ))
    toast.success(t('alquiler.gastoEliminado'))
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
          <h1 className="text-3xl font-heading font-bold tracking-tight">{t('alquiler.titulo')}</h1>
          <p className="text-muted-foreground">{t('alquiler.subtitulo')}</p>
          {soloLectura && (
            <span className="inline-block mt-1 rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
              Solo lectura
            </span>
          )}
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
            <Download className="mr-1 h-4 w-4" /> {t('alquiler.exportarExcel')}
          </Button>
          {!soloLectura && (
            <Button onClick={() => setShowForm(true)}>
              <Plus className="mr-2 h-4 w-4" />
              {t('alquiler.anyadirPropiedad')}
            </Button>
          )}
        </div>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <Input
          ref={searchRef}
          placeholder={t('alquiler.buscarPlaceholder')}
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="pl-9"
          aria-label="Buscar propiedades"
        />
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>{t('alquiler.nuevaPropiedad')}</CardTitle>
            <CardDescription>{t('alquiler.datosInmueble')}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAdd} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="direccion">{t('alquiler.direccion')}</Label>
                <Input id="direccion" name="direccion" required placeholder="Calle Mayor 1, Madrid" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ingresos">{t('alquiler.ingresoMensual')}</Label>
                <Input id="ingresos" name="ingresos" type="number" step="0.01" min="0" placeholder="800" />
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="inquilinoNombre">{t('alquiler.nombreInquilino')}</Label>
                  <Input id="inquilinoNombre" name="inquilinoNombre" placeholder="María García" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="inquilinoEmail">{t('alquiler.emailOpcional')}</Label>
                  <Input id="inquilinoEmail" name="inquilinoEmail" type="email" placeholder="maria@email.com" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="inquilinoTelefono">{t('alquiler.telefonoOpcional')}</Label>
                  <Input id="inquilinoTelefono" name="inquilinoTelefono" type="tel" placeholder="612 345 678" />
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={guardando}>{guardando ? t('alquiler.guardando') : t('alquiler.guardar')}</Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>{t('alquiler.cancelar')}</Button>
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
              <p className="font-medium">{t('alquiler.sinPropiedades')}</p>
              <p className="text-sm text-muted-foreground">
                {t('alquiler.anyadirPropiedades')}
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
              <p className="font-medium">{t('alquiler.sinResultados')}</p>
              <p className="text-sm text-muted-foreground">
                {t('alquiler.noEncontradas')} &quot;{busqueda}&quot;
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
            soloLectura={!!soloLectura}
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
