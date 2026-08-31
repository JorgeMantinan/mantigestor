'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Plus, Receipt, ArrowUpRight, Trash2, Repeat, Search, ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown, AlertCircle, CheckCircle, Clock, XCircle } from 'lucide-react'
import { BotonPDF } from '@/components/boton-pdf'
import { toast, Toaster } from 'sonner'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { useKeyboardShortcuts } from '@/hooks/use-keyboard-shortcuts'
import { Kbd } from '@/components/ui/kbd'
import { Download } from 'lucide-react'
import { descargarCsv } from '@/lib/descargar-csv'
import { descargarExcel } from '@/lib/descargar-excel'
import { generarPDFDeHTML } from '@/lib/pdf'
import { exportarTodoZIP } from '@/lib/exportar-zip'
import { logAccion } from '@/lib/audit-log'
import { detectarDuplicados, verificarPoliticaGasto } from '@mantigestor/utils'

interface Factura {
  id: string
  numero: string
  tipo: string
  emisorReceptor: string
  nifContraparte: string | null
  fechaEmision: string
  baseImponible: number
  iva: number
  total: number
  estado: string
}

type OrdenCampo = 'fechaEmision' | 'emisorReceptor' | 'total' | 'numero'
type OrdenDireccion = 'asc' | 'desc'
const PAGE_SIZE = 10

export default function FacturasPage() {
  const [facturas, setFacturas] = useState<Factura[]>([])
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState<'todas' | 'ingreso' | 'gasto'>('todas')
  const [busqueda, setBusqueda] = useState('')
  const [page, setPage] = useState(0)
  const [ordenCampo, setOrdenCampo] = useState<OrdenCampo>('fechaEmision')
  const [ordenDir, setOrdenDir] = useState<OrdenDireccion>('desc')
  const [fechaDesde, setFechaDesde] = useState('')
  const [fechaHasta, setFechaHasta] = useState('')
  const [seleccionadas, setSeleccionadas] = useState<Set<string>>(new Set())
  const searchRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  const getSupabase = useCallback(() => createClient(), [])

  useKeyboardShortcuts({
    onSearch: () => searchRef.current?.focus(),
    onNew: () => router.push('/gestoria/facturas/nueva'),
  })

  const fetchFacturas = useCallback(async () => {
    setLoading(true)
    const { data: { user } } = await getSupabase().auth.getUser()
    if (!user) { setLoading(false); return }
    const { data, error } = await getSupabase()
      .from('facturas')
      .select('*')
      .eq('perfilId', user.id)
      .order('createdAt', { ascending: false })
    if (!error && data) setFacturas(data as Factura[])
    setLoading(false)
  }, [getSupabase])

  useEffect(() => { fetchFacturas() }, [fetchFacturas])

  const eliminar = async (id: string) => {
    const factura = facturas.find(f => f.id === id)
    await getSupabase().from('facturas').delete().eq('id', id)
    await logAccion('eliminar', 'factura', id, `Factura ${factura?.numero ?? ''} eliminada`)
    setFacturas(prev => prev.filter(f => f.id !== id))
    toast.success('Factura eliminada')
  }

  const formatMoney = (cents: number) =>
    new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(cents / 100)

  const toggleSort = (campo: OrdenCampo) => {
    if (ordenCampo === campo) {
      setOrdenDir(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setOrdenCampo(campo)
      setOrdenDir('asc')
    }
    setPage(0)
  }

  const toggleSeleccion = (id: string) => {
    setSeleccionadas(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSeleccionAll = () => {
    if (seleccionadas.size === visibles.length) {
      setSeleccionadas(new Set())
    } else {
      setSeleccionadas(new Set(visibles.map(f => f.id)))
    }
  }

  const eliminarSeleccionadas = async () => {
    const ids = Array.from(seleccionadas)
    await getSupabase().from('facturas').delete().in('id', ids)
    await logAccion('eliminar', 'factura', ids.join(','), `${ids.length} facturas eliminadas`)
    setFacturas(prev => prev.filter(f => !seleccionadas.has(f.id)))
    setSeleccionadas(new Set())
    toast.success(`${ids.length} factura${ids.length !== 1 ? 's' : ''} eliminada${ids.length !== 1 ? 's' : ''}`)
  }

  const cambiarEstadoSeleccionadas = async (nuevoEstado: string) => {
    const ids = Array.from(seleccionadas)
    await getSupabase().from('facturas').update({ estado: nuevoEstado }).in('id', ids)
    await logAccion('cambio_estado', 'factura', ids.join(','), `${ids.length} facturas → ${nuevoEstado}`)
    setFacturas(prev => prev.map(f => seleccionadas.has(f.id) ? { ...f, estado: nuevoEstado } : f))
    setSeleccionadas(new Set())
    toast.success(`${ids.length} factura${ids.length !== 1 ? 's' : ''} marcada${ids.length !== 1 ? 's' : ''} como ${nuevoEstado}`)
  }

  const exportarSeleccionadas = () => {
    const seleccionadasFacturas = facturas.filter(f => seleccionadas.has(f.id))
    const headers = ['Fecha', 'Tipo', 'Nº Factura', 'Contraparte', 'Base Imponible', 'IVA', 'Total', 'Estado']
    const rows = seleccionadasFacturas.map(v => [
      v.fechaEmision.slice(0, 10), v.tipo === 'ingreso' ? 'Ingreso' : 'Gasto',
      v.numero || '', v.emisorReceptor || '',
      v.baseImponible.toFixed(2), v.iva.toFixed(2), v.total.toFixed(2),
      v.estado || ''
    ])
    descargarExcel(headers, rows, `facturas-seleccion-${new Date().toISOString().slice(0, 10)}.xlsx`, 'Facturas')
  }

  const exportarSeleccionadasPDF = async () => {
    const seleccionadasFacturas = facturas.filter(f => seleccionadas.has(f.id))
    const rows = seleccionadasFacturas.map(v =>
      `<tr>
        <td style="padding:6px;border-bottom:1px solid #e5e7eb">${new Date(v.fechaEmision).toLocaleDateString('es-ES')}</td>
        <td style="padding:6px;border-bottom:1px solid #e5e7eb">${v.tipo === 'ingreso' ? 'Ingreso' : 'Gasto'}</td>
        <td style="padding:6px;border-bottom:1px solid #e5e7eb">${v.numero}</td>
        <td style="padding:6px;border-bottom:1px solid #e5e7eb">${v.emisorReceptor}</td>
        <td style="padding:6px;border-bottom:1px solid #e5e7eb;text-align:right">${formatMoney(v.baseImponible)}</td>
        <td style="padding:6px;border-bottom:1px solid #e5e7eb;text-align:right">${v.iva}%</td>
        <td style="padding:6px;border-bottom:1px solid #e5e7eb;text-align:right;font-weight:bold">${formatMoney(v.total)}</td>
        <td style="padding:6px;border-bottom:1px solid #e5e7eb;text-align:center">${v.estado}</td>
      </tr>`
    ).join('')
    const html = `
      <h1 style="font-size:18px;margin-bottom:16px">Facturas seleccionadas (${seleccionadasFacturas.length})</h1>
      <table style="width:100%;border-collapse:collapse;font-size:10px">
        <thead><tr style="background:#f3f4f6">
          <th style="padding:6px;text-align:left;border-bottom:2px solid #d1d5db">Fecha</th>
          <th style="padding:6px;text-align:left;border-bottom:2px solid #d1d5db">Tipo</th>
          <th style="padding:6px;text-align:left;border-bottom:2px solid #d1d5db">Nº</th>
          <th style="padding:6px;text-align:left;border-bottom:2px solid #d1d5db">Contraparte</th>
          <th style="padding:6px;text-align:right;border-bottom:2px solid #d1d5db">Base</th>
          <th style="padding:6px;text-align:right;border-bottom:2px solid #d1d5db">IVA</th>
          <th style="padding:6px;text-align:right;border-bottom:2px solid #d1d5db">Total</th>
          <th style="padding:6px;text-align:center;border-bottom:2px solid #d1d5db">Estado</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
    `
    await generarPDFDeHTML(html, `facturas-seleccion-${new Date().toISOString().slice(0, 10)}`, { orientacion: 'landscape' })
  }

  const SortIcon = ({ campo }: { campo: OrdenCampo }) => {
    if (ordenCampo !== campo) return <ArrowUpDown className="ml-1 h-3 w-3 opacity-40" />
    return ordenDir === 'asc'
      ? <ArrowUp className="ml-1 h-3 w-3" />
      : <ArrowDown className="ml-1 h-3 w-3" />
  }

  const visibles = useMemo(() => {
    let result = filtro === 'todas' ? facturas : facturas.filter(f => f.tipo === filtro)

    if (busqueda.trim()) {
      const q = busqueda.toLowerCase()
      result = result.filter(f =>
        f.emisorReceptor.toLowerCase().includes(q) ||
        f.numero.toLowerCase().includes(q) ||
        f.estado.toLowerCase().includes(q)
      )
    }

    if (fechaDesde) result = result.filter(f => f.fechaEmision >= fechaDesde)
    if (fechaHasta) result = result.filter(f => f.fechaEmision <= fechaHasta)

    result.sort((a, b) => {
      let cmp = 0
      switch (ordenCampo) {
        case 'fechaEmision': cmp = new Date(a.fechaEmision).getTime() - new Date(b.fechaEmision).getTime(); break
        case 'emisorReceptor': cmp = a.emisorReceptor.localeCompare(b.emisorReceptor); break
        case 'total': cmp = a.total - b.total; break
        case 'numero': cmp = a.numero.localeCompare(b.numero); break
      }
      return ordenDir === 'asc' ? cmp : -cmp
    })

    return result
  }, [facturas, filtro, busqueda, fechaDesde, fechaHasta, ordenCampo, ordenDir])

  const totalPages = Math.ceil(visibles.length / PAGE_SIZE)
  const paginadas = visibles.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  const duplicados = useMemo(() => detectarDuplicados(facturas), [facturas])

  const politicas = useMemo(() => {
    const incumplimientos = facturas.flatMap(f => verificarPoliticaGasto(f))
    return incumplimientos.slice(0, 5)
  }, [facturas])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-heading font-bold tracking-tight">Facturas</h1>
          <p className="text-muted-foreground">Gestiona tus facturas emitidas y recibidas</p>
        </div>
        <div className="flex gap-2">
          <Link href="/gestoria/facturas/recurrentes">
            <Button variant="outline" size="sm">
              <Repeat className="mr-1 h-3 w-3" /> Recurrentes
            </Button>
          </Link>
          <BotonPDF elementId="tabla-facturas" filename={`facturas-${new Date().toISOString().slice(0, 10)}`} />
          <Link href="/gestoria/facturas/nueva">
            <Button><Plus className="mr-2 h-4 w-4" /> Nueva factura</Button>
          </Link>
        </div>
      </div>

      {/* Búsqueda + filtros */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input
            ref={searchRef}
            placeholder="Buscar por contraparte, nº factura..."
            value={busqueda}
            onChange={e => { setBusqueda(e.target.value); setPage(0) }}
            className="pl-9"
            aria-label="Buscar facturas"
            data-search-input
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <Kbd>/</Kbd>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Input type="date" value={fechaDesde} onChange={e => { setFechaDesde(e.target.value); setPage(0) }}
            className="w-[150px]" placeholder="Desde" />
          <span className="text-muted-foreground text-xs">—</span>
          <Input type="date" value={fechaHasta} onChange={e => { setFechaHasta(e.target.value); setPage(0) }}
            className="w-[150px]" placeholder="Hasta" />
        </div>
        <div className="flex gap-2">
          {(['todas', 'ingreso', 'gasto'] as const).map(f => (
            <Button key={f} variant={filtro === f ? 'secondary' : 'outline'} size="sm"
              onClick={() => { setFiltro(f); setPage(0) }}>
              {f === 'todas' ? 'Todas' : f === 'ingreso' ? 'Ingresos' : 'Gastos'}
            </Button>
          ))}
        </div>
        <div className="flex-1" />
        <Button variant="outline" size="sm" disabled={visibles.length === 0}
          onClick={() => {
            const headers = ['Fecha', 'Tipo', 'Nº Factura', 'Contraparte', 'Base Imponible', 'IVA', 'Total', 'Estado']
            const rows = visibles.map(v => [
              v.fechaEmision.slice(0, 10), v.tipo === 'ingreso' ? 'Ingreso' : 'Gasto',
              v.numero || '', v.emisorReceptor || '',
              v.baseImponible.toFixed(2), v.iva.toFixed(2), v.total.toFixed(2),
              v.estado || ''
            ])
            descargarExcel(headers, rows, `facturas-${new Date().toISOString().slice(0, 10)}.xlsx`, 'Facturas')
          }}>
          <Download className="mr-1 h-4 w-4" /> Exportar Excel
        </Button>
        <Button variant="outline" size="sm" disabled={visibles.length === 0}
          onClick={() => void exportarTodoZIP(visibles)}>
          <Download className="mr-1 h-4 w-4" /> Exportar ZIP
        </Button>
      </div>

      {duplicados.length > 0 && (
        <div className="rounded-lg border border-orange-200 bg-orange-50 p-3 text-sm dark:border-orange-800 dark:bg-orange-950">
          <div className="flex items-center gap-2 font-medium text-orange-800 dark:text-orange-200">
            <AlertCircle className="h-4 w-4" />
            Posibles duplicados detectados ({duplicados.length})
          </div>
          <ul className="mt-1 space-y-1 text-orange-700 dark:text-orange-300">
            {duplicados.slice(0, 3).map((d, i) => (
              <li key={i} className="text-xs">
                {d.factura1.numero} ↔ {d.factura2.numero}: {d.razon}
              </li>
            ))}
            {duplicados.length > 3 && (
              <li className="text-xs">... y {duplicados.length - 3} más</li>
            )}
          </ul>
        </div>
      )}

      {politicas.length > 0 && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm dark:border-blue-800 dark:bg-blue-950">
          <div className="flex items-center gap-2 font-medium text-blue-800 dark:text-blue-200">
            <AlertCircle className="h-4 w-4" />
            Políticas de gasto ({politicas.length} alertas)
          </div>
          <ul className="mt-1 space-y-1 text-blue-700 dark:text-blue-300">
            {politicas.map((p, i) => (
              <li key={i} className="text-xs">
                <span className="font-medium">{p.facturaNumero}</span>: {p.descripcion}
              </li>
            ))}
          </ul>
        </div>
      )}

      {loading ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground">Cargando facturas...</CardContent></Card>
      ) : visibles.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-12">
            <Receipt className="h-12 w-12 text-muted-foreground" />
            <div className="text-center">
              <p className="font-medium">No hay {busqueda ? 'resultados' : filtro !== 'todas' ? `facturas de tipo "${filtro}"` : 'facturas'}</p>
              <p className="text-sm text-muted-foreground">
                {busqueda ? 'Prueba con otra búsqueda' : 'Crea tu primera factura para empezar'}
              </p>
            </div>
            {!busqueda && (
              <Link href="/gestoria/facturas/nueva">
                <Button><Plus className="mr-2 h-4 w-4" /> Crear factura</Button>
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          <p className="text-xs text-muted-foreground">
            {visibles.length} factura{visibles.length !== 1 ? 's' : ''}
            {busqueda && ` · Buscando "${busqueda}"`}
          </p>

          {seleccionadas.size > 0 && (
            <div className="flex items-center gap-2 rounded-lg border bg-muted/50 p-2 flex-wrap">
              <span className="text-sm font-medium">{seleccionadas.size} seleccionada{seleccionadas.size !== 1 ? 's' : ''}</span>
              <div className="flex-1" />
              <div className="flex items-center gap-1 border-r pr-2">
                <span className="text-xs text-muted-estado">Estado:</span>
                <Button variant="outline" size="sm" onClick={() => void cambiarEstadoSeleccionadas('pendiente')}>
                  <Clock className="mr-1 h-3 w-3" /> Pendiente
                </Button>
                <Button variant="outline" size="sm" onClick={() => void cambiarEstadoSeleccionadas('pagada')}>
                  <CheckCircle className="mr-1 h-3 w-3" /> Pagada
                </Button>
                <Button variant="outline" size="sm" onClick={() => void cambiarEstadoSeleccionadas('vencida')}>
                  <XCircle className="mr-1 h-3 w-3" /> Vencida
                </Button>
              </div>
              <div className="flex items-center gap-1 border-r pr-2">
                <span className="text-xs text-muted-foreground">Exportar:</span>
                <Button variant="outline" size="sm" onClick={() => void exportarSeleccionadasPDF()}>
                  <Download className="mr-1 h-3 w-3" /> PDF
                </Button>
                <Button variant="outline" size="sm" onClick={exportarSeleccionadas}>
                  <Download className="mr-1 h-3 w-3" /> Excel
                </Button>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
                    <Trash2 className="mr-1 h-3 w-3" /> Eliminar
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>¿Eliminar {seleccionadas.size} factura{seleccionadas.size !== 1 ? 's' : ''}?</AlertDialogTitle>
                    <AlertDialogDescription>Esta acción no se puede deshacer.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={() => void eliminarSeleccionadas()}>Eliminar</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <Button variant="ghost" size="sm" onClick={() => setSeleccionadas(new Set())}>Cancelar</Button>
            </div>
          )}

          <div id="tabla-facturas" className="rounded-lg border">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-3 w-10">
                      <input
                        type="checkbox"
                        className="rounded border-input"
                        checked={visibles.length > 0 && seleccionadas.size === visibles.length}
                        onChange={toggleSeleccionAll}
                        aria-label="Seleccionar todas"
                      />
                    </th>
                    <th className="px-4 py-3 text-left font-medium cursor-pointer select-none" onClick={() => toggleSort('numero')}>
                      Nº <SortIcon campo="numero" />
                    </th>
                    <th className="px-4 py-3 text-left font-medium">Tipo</th>
                    <th className="px-4 py-3 text-left font-medium cursor-pointer select-none" onClick={() => toggleSort('emisorReceptor')}>
                      Contraparte <SortIcon campo="emisorReceptor" />
                    </th>
                    <th className="px-4 py-3 text-left font-medium cursor-pointer select-none" onClick={() => toggleSort('fechaEmision')}>
                      Fecha <SortIcon campo="fechaEmision" />
                    </th>
                    <th className="px-4 py-3 text-right font-medium">Base</th>
                    <th className="px-4 py-3 text-right font-medium">IVA</th>
                    <th className="px-4 py-3 text-right font-medium cursor-pointer select-none" onClick={() => toggleSort('total')}>
                      Total <SortIcon campo="total" />
                    </th>
                    <th className="px-4 py-3 text-center font-medium">Estado</th>
                    <th className="px-4 py-3 text-right font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {paginadas.map(f => (
                    <tr key={f.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          className="rounded border-input"
                          checked={seleccionadas.has(f.id)}
                          onChange={() => toggleSeleccion(f.id)}
                          aria-label={`Seleccionar factura ${f.numero}`}
                        />
                      </td>
                      <td className="px-4 py-3 font-medium">{f.numero}</td>
                      <td className="px-4 py-3 capitalize">{f.tipo === 'ingreso' ? 'Emitida' : 'Recibida'}</td>
                      <td className="px-4 py-3">{f.emisorReceptor}</td>
                      <td className="px-4 py-3">{new Date(f.fechaEmision).toLocaleDateString('es-ES')}</td>
                      <td className="px-4 py-3 text-right">{formatMoney(f.baseImponible)}</td>
                      <td className="px-4 py-3 text-right">{f.iva}%</td>
                      <td className="px-4 py-3 text-right font-medium">{formatMoney(f.total)}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                          f.estado === 'pagada'
                            ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                            : f.estado === 'vencida'
                              ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
                              : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300'
                        }`}>
                          {f.estado}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-1">
                          <Link href={`/gestoria/facturas/${f.id}`}>
                            <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Ver factura"><ArrowUpRight className="h-4 w-4" aria-hidden="true" /></Button>
                          </Link>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" aria-label="Eliminar factura">
                                <Trash2 className="h-4 w-4" aria-hidden="true" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>¿Eliminar esta factura?</AlertDialogTitle>
                                <AlertDialogDescription>Esta acción no se puede deshacer.</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => void eliminar(f.id)}>Eliminar</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Paginación */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                Página {page + 1} de {totalPages}
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
                  <ChevronLeft className="h-4 w-4" /> Anterior
                </Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
                  Siguiente <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
      <Toaster richColors position="top-right" />
    </div>
  )
}
