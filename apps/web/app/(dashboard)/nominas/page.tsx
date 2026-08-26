'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Users, Plus, Calendar, Briefcase, User, TrendingDown, TrendingUp, Search, ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import { FileUpload } from '@/components/upload/FileUpload'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { Toaster, toast } from 'sonner'

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

interface Nomina {
  id: string
  empleada: string
  mes: number
  anyo: number
  salarioBruto: number
  irpf: number
  seguridadSocial: number
  neto: number
  rol: 'jefe' | 'empleado'
  pdfUrl?: string | null
}

type OrdenCampo = 'empleada' | 'mes' | 'salarioBruto' | 'neto'
type OrdenDireccion = 'asc' | 'desc'
const PAGE_SIZE = 10

const formatMoney = (cents: number) =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(cents / 100)

export default function NominasPage() {
  const [nominas, setNominas] = useState<Nomina[]>([])
  const [showForm, setShowForm] = useState(false)
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [anyoFiltro, setAnyoFiltro] = useState(new Date().getFullYear())
  const [rolDefecto, setRolDefecto] = useState<'jefe' | 'empleado'>('jefe')
  const [busqueda, setBusqueda] = useState('')
  const [filtroRol, setFiltroRol] = useState<'todas' | 'jefe' | 'empleado'>('todas')
  const [page, setPage] = useState(0)
  const [ordenCampo, setOrdenCampo] = useState<OrdenCampo>('empleada')
  const [ordenDir, setOrdenDir] = useState<OrdenDireccion>('asc')
  const getSupabase = useCallback(() => createClient(), [])

  useEffect(() => {
    const init = async () => {
      const supabase = getSupabase()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)

      const { data } = await supabase
        .from('nominas')
        .select('*')
        .eq('perfilId', user.id)
        .eq('anyo', anyoFiltro)
        .order('mes', { ascending: false })

      if (data) setNominas(data as Nomina[])
    }
    init()
  }, [getSupabase, anyoFiltro])

  const handleAdd = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setGuardando(true)
    const form = new FormData(e.currentTarget)
    const supabase = getSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setGuardando(false); return }

    const salarioBruto = parseFloat(form.get('salarioBruto') as string) * 100
    const irpf = parseFloat(form.get('irpf') as string)
    const seguridadSocial = parseFloat(form.get('seguridadSocial') as string) * 100
    const rol = form.get('rol') as 'jefe' | 'empleado'
    const descIrpf = Math.round(salarioBruto * (irpf / 100))
    const neto = salarioBruto - descIrpf - seguridadSocial

    const { error } = await supabase.from('nominas').insert({
      id: crypto.randomUUID(),
      perfilId: user.id,
      empleada: form.get('empleada') as string,
      mes: parseInt(form.get('mes') as string, 10),
      anyo: parseInt(form.get('anyo') as string, 10),
      salarioBruto,
      irpf,
      seguridadSocial,
      neto,
      rol,
      pdfUrl: pdfUrl || null,
    })

    if (!error) {
      setNominas(prev => [{
        id: crypto.randomUUID(),
        empleada: form.get('empleada') as string,
        mes: parseInt(form.get('mes') as string, 10),
        anyo: parseInt(form.get('anyo') as string, 10),
        salarioBruto,
        irpf,
        seguridadSocial,
        neto,
        rol,
        pdfUrl: pdfUrl || null,
      }, ...prev].sort((a, b) => b.mes - a.mes))
      toast.success('Nómina guardada correctamente')
    }

    setShowForm(false)
    setPdfUrl(null)
    setGuardando(false)
  }

  const handleDelete = async (id: string) => {
    const supabase = getSupabase()
    await supabase.from('nominas').delete().eq('id', id)
    setNominas(prev => prev.filter(n => n.id !== id))
    toast.success('Nómina eliminada')
  }

  const toggleSort = (campo: OrdenCampo) => {
    if (ordenCampo === campo) {
      setOrdenDir(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setOrdenCampo(campo)
      setOrdenDir('asc')
    }
    setPage(0)
  }

  const SortIcon = ({ campo }: { campo: OrdenCampo }) => {
    if (ordenCampo !== campo) return <ArrowUpDown className="ml-1 h-3 w-3 opacity-40" />
    return ordenDir === 'asc'
      ? <ArrowUp className="ml-1 h-3 w-3" />
      : <ArrowDown className="ml-1 h-3 w-3" />
  }

  const visibles = useMemo(() => {
    let result = filtroRol === 'todas' ? nominas : nominas.filter(n => n.rol === filtroRol)

    if (busqueda.trim()) {
      const q = busqueda.toLowerCase()
      result = result.filter(n => n.empleada.toLowerCase().includes(q))
    }

    result.sort((a, b) => {
      let cmp = 0
      switch (ordenCampo) {
        case 'empleada': cmp = a.empleada.localeCompare(b.empleada); break
        case 'mes': cmp = a.mes - b.mes; break
        case 'salarioBruto': cmp = a.salarioBruto - b.salarioBruto; break
        case 'neto': cmp = a.neto - b.neto; break
      }
      return ordenDir === 'asc' ? cmp : -cmp
    })

    return result
  }, [nominas, filtroRol, busqueda, ordenCampo, ordenDir])

  const totalPages = Math.ceil(visibles.length / PAGE_SIZE)
  const paginadas = visibles.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  // Totales por rol
  const jefe = nominas.filter(n => n.rol === 'jefe')
  const empleado = nominas.filter(n => n.rol === 'empleado')

  const totalBrutoJefe = jefe.reduce((s, n) => s + n.salarioBruto, 0)
  const totalIrpfJefe = jefe.reduce((s, n) => s + Math.round(n.salarioBruto * (n.irpf / 100)), 0)
  const totalSsJefe = jefe.reduce((s, n) => s + n.seguridadSocial, 0)
  const totalNetoJefe = jefe.reduce((s, n) => s + n.neto, 0)

  const totalBrutoEmp = empleado.reduce((s, n) => s + n.salarioBruto, 0)
  const totalIrpfEmp = empleado.reduce((s, n) => s + Math.round(n.salarioBruto * (n.irpf / 100)), 0)
  const totalNetoEmp = empleado.reduce((s, n) => s + n.neto, 0)

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-heading font-bold tracking-tight">Nóminas</h1>
            <p className="text-muted-foreground">
              Gestión de nóminas — empleadas del hogar y retenciones IRPF
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 rounded-md border p-0.5">
              <Button
                type="button"
                size="sm"
                variant={rolDefecto === 'jefe' ? 'secondary' : 'ghost'}
                onClick={() => setRolDefecto('jefe')}
                className="gap-1 text-xs"
              >
                <Briefcase className="h-3 w-3" aria-hidden="true" />
                Soy el jefe
              </Button>
              <Button
                type="button"
                size="sm"
                variant={rolDefecto === 'empleado' ? 'secondary' : 'ghost'}
                onClick={() => setRolDefecto('empleado')}
                className="gap-1 text-xs"
              >
                <User className="h-3 w-3" aria-hidden="true" />
                Soy la empleada
              </Button>
            </div>
            <Button onClick={() => setShowForm(true)}>
              <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
              Nueva nómina
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {[anyoFiltro - 1, anyoFiltro, anyoFiltro + 1].map(a => (
            <Button
              key={a}
              type="button"
              size="sm"
              variant={a === anyoFiltro ? 'secondary' : 'outline'}
              onClick={() => setAnyoFiltro(a)}
            >
              {a}
            </Button>
          ))}
        </div>

        {/* Búsqueda + filtros */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por empleada..."
              value={busqueda}
              onChange={e => { setBusqueda(e.target.value); setPage(0) }}
              className="pl-9"
            />
          </div>
          <div className="flex gap-2">
            {(['todas', 'jefe', 'empleado'] as const).map(f => (
              <Button key={f} variant={filtroRol === f ? 'secondary' : 'outline'} size="sm"
                onClick={() => { setFiltroRol(f); setPage(0) }}>
                {f === 'todas' ? 'Todas' : f === 'jefe' ? 'Jefe' : 'Empleada'}
              </Button>
            ))}
          </div>
        </div>

        {showForm && (
          <Card>
            <CardHeader>
              <CardTitle>Nueva nómina</CardTitle>
              <CardDescription>
                {rolDefecto === 'jefe'
                  ? 'Como empleador: el gasto es deducible en tu Modelo 130'
                  : 'Como empleada: las retenciones IRPF se descuentan de tu declaración anual'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAdd} className="space-y-4">
                <input type="hidden" name="rol" value={rolDefecto} />
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="empleada">Nombre de la empleada</Label>
                    <Input id="empleada" name="empleada" required placeholder="Nombre completo" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="mes">Mes</Label>
                    <select
                      id="mes"
                      name="mes"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                      {MESES.map((m, i) => (
                        <option key={i + 1} value={i + 1}>{m}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="anyoForm">Año</Label>
                    <Input id="anyoForm" name="anyo" type="number" min="2020" max="2030" defaultValue={anyoFiltro} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="salarioBruto">Salario bruto mensual (€)</Label>
                    <Input id="salarioBruto" name="salarioBruto" type="number" step="0.01" required placeholder="1200.00" />
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="irpf">Retención IRPF (%)</Label>
                    <Input id="irpf" name="irpf" type="number" step="0.1" required placeholder="2" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="seguridadSocial">Seg. Social empleado (€)</Label>
                    <Input id="seguridadSocial" name="seguridadSocial" type="number" step="0.01" required placeholder="50.00" />
                  </div>
                </div>
                <FileUpload
                  bucket="documentos"
                  path={userId ?? ''}
                  tipo="nomina"
                  accept=".pdf"
                  buttonText="Subir nómina PDF"
                  onUploadComplete={(url) => setPdfUrl(url)}
                />
                <div className="flex gap-4 pt-2">
                  <Button type="submit" className="flex-1" disabled={guardando}>
                    {guardando ? 'Guardando...' : 'Guardar nómina'}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setShowForm(false)} className="flex-1">
                    Cancelar
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Resumen */}
        {nominas.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {jefe.length > 0 && (
              <>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Gasto deducible (jefe)</CardTitle>
                    <Briefcase className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-red-600">{formatMoney(totalBrutoJefe)}</div>
                    <p className="text-xs text-muted-foreground">{jefe.length} nóminas · {formatMoney(totalIrpfJefe)} IRPF retenido</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Neto pagado (jefe)</CardTitle>
                    <TrendingDown className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatMoney(totalNetoJefe)}</div>
                    <p className="text-xs text-muted-foreground">Salario neto + SS + IRPF</p>
                  </CardContent>
                </Card>
              </>
            )}
            {empleado.length > 0 && (
              <>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Bruto recibido (empleado)</CardTitle>
                    <User className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">{formatMoney(totalBrutoEmp)}</div>
                    <p className="text-xs text-muted-foreground">{empleado.length} nóminas</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">IRPF retenido (empleado)</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">{formatMoney(totalIrpfEmp)}</div>
                    <p className="text-xs text-muted-foreground">Se descuenta de tu declaración anual</p>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        )}

        {nominas.length === 0 && !showForm && (
          <Card>
            <CardContent className="flex flex-col items-center gap-4 py-12">
              <Users className="h-12 w-12 text-muted-foreground" />
              <div className="text-center">
                <p className="font-medium">No hay nóminas en {anyoFiltro}</p>
                <p className="text-sm text-muted-foreground">
                  Añade nóminas para empleadas del hogar. Si eres el jefe, el gasto es deducible.
                  Si eres la empleada, las retenciones reducen tu IRPF anual.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {visibles.length > 0 && (
          <>
            <p className="text-xs text-muted-foreground">
              {visibles.length} nómina{visibles.length !== 1 ? 's' : ''}
              {busqueda && ` · Buscando "${busqueda}"`}
            </p>

            <div className="rounded-lg border">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="px-4 py-3 text-left font-medium">Rol</th>
                      <th className="px-4 py-3 text-left font-medium cursor-pointer select-none" onClick={() => toggleSort('empleada')}>
                        Empleada <SortIcon campo="empleada" />
                      </th>
                      <th className="px-4 py-3 text-left font-medium cursor-pointer select-none" onClick={() => toggleSort('mes')}>
                        Mes <SortIcon campo="mes" />
                      </th>
                      <th className="px-4 py-3 text-right font-medium">IRPF</th>
                      <th className="px-4 py-3 text-right font-medium">S.Social</th>
                      <th className="px-4 py-3 text-right font-medium cursor-pointer select-none" onClick={() => toggleSort('salarioBruto')}>
                        Bruto <SortIcon campo="salarioBruto" />
                      </th>
                      <th className="px-4 py-3 text-right font-medium cursor-pointer select-none" onClick={() => toggleSort('neto')}>
                        Neto <SortIcon campo="neto" />
                      </th>
                      <th className="px-4 py-3 text-right font-medium" />
                    </tr>
                  </thead>
                  <tbody>
                    {paginadas.map((n) => (
                      <tr key={n.id} className="border-b last:border-0 hover:bg-muted/30">
                        <td className="px-4 py-3">
                          {n.rol === 'jefe' ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2 py-0.5 text-xs font-medium text-blue-700">
                              <Briefcase className="h-3 w-3" aria-hidden="true" /> Jefe
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-green-500/10 px-2 py-0.5 text-xs font-medium text-green-700">
                              <User className="h-3 w-3" aria-hidden="true" /> Empleada
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">{n.empleada}</td>
                        <td className="px-4 py-3">{MESES[n.mes - 1]} {n.anyo}</td>
                        <td className="px-4 py-3 text-right">{n.irpf}%</td>
                        <td className="px-4 py-3 text-right">{formatMoney(n.seguridadSocial)}</td>
                        <td className="px-4 py-3 text-right">{formatMoney(n.salarioBruto)}</td>
                        <td className="px-4 py-3 text-right font-medium">{formatMoney(n.neto)}</td>
                        <td className="px-4 py-3 text-right">
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs text-destructive hover:text-destructive"
                              >
                                Borrar
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>¿Eliminar nómina?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Esta acción no se puede deshacer. Se eliminará la nómina de {n.empleada} permanentemente.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => void handleDelete(n.id)}>
                                  Eliminar
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={page === 0}
                  onClick={() => setPage(p => p - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm text-muted-foreground">
                  Página {page + 1} de {totalPages}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages - 1}
                  onClick={() => setPage(p => p + 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </>
        )}
      </div>
      <Toaster richColors position="top-right" />
    </>
  )
}
