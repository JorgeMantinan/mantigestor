'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Plus, Receipt, ArrowUpRight, Trash2, Repeat, Search, ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import { BotonPDF } from '@/components/boton-pdf'
import { toast, Toaster } from 'sonner'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { useKeyboardShortcuts } from '@/hooks/use-keyboard-shortcuts'
import { Kbd } from '@/components/ui/kbd'
import { Download } from 'lucide-react'
import { descargarCsv } from '@/lib/descargar-csv'
import { logAccion } from '@/lib/audit-log'

interface Factura {
  id: string
  numero: string
  tipo: string
  emisorReceptor: string
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
            const filas: string[][] = [
              ['Fecha', 'Tipo', 'Nº Factura', 'Contraparte', 'Base Imponible', 'IVA', 'Total', 'Estado'],
              ...visibles.map(v => [
                v.fechaEmision.slice(0, 10), v.tipo === 'ingreso' ? 'Ingreso' : 'Gasto',
                v.numero || '', v.emisorReceptor || '',
                v.baseImponible.toFixed(2), v.iva.toFixed(2), v.total.toFixed(2),
                v.estado || ''
              ])
            ]
            descargarCsv(filas, `facturas-${new Date().toISOString().slice(0, 10)}.csv`)
          }}>
          <Download className="mr-1 h-4 w-4" /> Exportar
        </Button>
      </div>

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

          <div id="tabla-facturas" className="rounded-lg border">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
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
                      <td className="px-4 py-3 font-medium">{f.numero}</td>
                      <td className="px-4 py-3 capitalize">{f.tipo === 'ingreso' ? 'Emitida' : 'Recibida'}</td>
                      <td className="px-4 py-3">{f.emisorReceptor}</td>
                      <td className="px-4 py-3">{new Date(f.fechaEmision).toLocaleDateString('es-ES')}</td>
                      <td className="px-4 py-3 text-right">{formatMoney(f.baseImponible)}</td>
                      <td className="px-4 py-3 text-right">{f.iva}%</td>
                      <td className="px-4 py-3 text-right font-medium">{formatMoney(f.total)}</td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-block rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900 dark:text-green-300">
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
