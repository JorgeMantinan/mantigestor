'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { KanbanCobros } from '@/components/kanban-cobros'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { toast, Toaster } from 'sonner'
import { formatoMoneda } from '@/lib/divisas'
import { logAccion } from '@/lib/audit-log'
import { Landmark, Clock, CheckCircle, ArrowUpRight, ChevronLeft, ChevronRight } from 'lucide-react'

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

export default function CobrosPage() {
  const [facturas, setFacturas] = useState<Factura[]>([])
  const [loading, setLoading] = useState(true)
  const [fechaDesde, setFechaDesde] = useState('')
  const [fechaHasta, setFechaHasta] = useState('')
  const [page, setPage] = useState(0)
  const ITEMS_PER_PAGE = 25

  const fetchFacturas = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }
    const { data, error } = await supabase
      .from('facturas')
      .select('*')
      .eq('perfilId', user.id)
      .eq('tipo', 'ingreso')
      .order('fechaEmision', { ascending: false })
    if (!error && data) setFacturas(data as Factura[])
    setLoading(false)
  }, [])

  useEffect(() => { fetchFacturas() }, [fetchFacturas])

  const facturasFiltradas = useMemo(() => {
    let result = facturas
    if (fechaDesde) result = result.filter(f => f.fechaEmision >= fechaDesde)
    if (fechaHasta) result = result.filter(f => f.fechaEmision <= fechaHasta)
    return result
  }, [facturas, fechaDesde, fechaHasta])

  const totalGeneral = useMemo(() =>
    facturasFiltradas.reduce((s, f) => s + f.total, 0)
  , [facturasFiltradas])

  const totalPendiente = useMemo(() =>
    facturasFiltradas.filter(f => f.estado === 'pendiente').reduce((s, f) => s + f.total, 0)
  , [facturasFiltradas])

  const totalEnProceso = useMemo(() =>
    facturasFiltradas.filter(f => f.estado === 'en_proceso').reduce((s, f) => s + f.total, 0)
  , [facturasFiltradas])

  const totalCobrado = useMemo(() =>
    facturasFiltradas.filter(f => f.estado === 'pagada' || f.estado === 'parcial').reduce((s, f) => s + f.total, 0)
  , [facturasFiltradas])

  const totalPages = Math.ceil(facturasFiltradas.length / ITEMS_PER_PAGE)
  const paginadas = useMemo(() =>
    facturasFiltradas.slice(page * ITEMS_PER_PAGE, (page + 1) * ITEMS_PER_PAGE)
  , [facturasFiltradas, page])

  const handleEstadoCambiado = useCallback(async (facturaId: string, nuevoEstado: string) => {
    const supabase = createClient()
    const { error } = await supabase
      .from('facturas')
      .update({ estado: nuevoEstado })
      .eq('id', facturaId)
    if (error) {
      toast.error('Error al cambiar estado')
      return
    }
    await logAccion('cambio_estado', 'factura', facturaId, `Estado → ${nuevoEstado}`)
    setFacturas(prev => prev.map(f =>
      f.id === facturaId ? { ...f, estado: nuevoEstado } : f
    ))
    toast.success(`Factura marcada como ${nuevoEstado}`)
  }, [])

  const formatMoney = (cents: number) => formatoMoneda(cents / 100, 'EUR')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-heading font-bold tracking-tight">Cobros</h1>
        <p className="text-muted-foreground">Pipeline de cobro de facturas emitidas</p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex items-center gap-2">
          <Input type="date" value={fechaDesde} onChange={e => setFechaDesde(e.target.value)}
            className="w-[150px]" placeholder="Desde" />
          <span className="text-muted-foreground text-xs">—</span>
          <Input type="date" value={fechaHasta} onChange={e => setFechaHasta(e.target.value)}
            className="w-[150px]" placeholder="Hasta" />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="flex items-center gap-3 py-3">
            <div className="rounded-lg bg-gray-100 dark:bg-gray-800 p-2">
              <Clock className="h-4 w-4 text-gray-600 dark:text-gray-400" aria-hidden="true" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Pendiente</p>
              <p className="text-sm font-semibold">{formatMoney(totalPendiente)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 py-3">
            <div className="rounded-lg bg-blue-100 dark:bg-blue-800 p-2">
              <ArrowUpRight className="h-4 w-4 text-blue-600 dark:text-blue-400" aria-hidden="true" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">En proceso</p>
              <p className="text-sm font-semibold">{formatMoney(totalEnProceso)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 py-3">
            <div className="rounded-lg bg-green-100 dark:bg-green-800 p-2">
              <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" aria-hidden="true" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Cobrado</p>
              <p className="text-sm font-semibold">{formatMoney(totalCobrado)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 py-3">
            <div className="rounded-lg bg-primary/10 p-2">
              <Landmark className="h-4 w-4 text-primary" aria-hidden="true" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total</p>
              <p className="text-sm font-semibold">{formatMoney(totalGeneral)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {loading ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground">Cargando facturas...</CardContent></Card>
      ) : facturasFiltradas.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-12">
            <Landmark className="h-12 w-12 text-muted-foreground" />
            <div className="text-center">
              <p className="font-medium">No hay facturas emitidas</p>
              <p className="text-sm text-muted-foreground">
                Crea facturas de tipo &quot;ingreso&quot; para ver el pipeline de cobros
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <KanbanCobros
            facturas={paginadas}
            onEstadoCambiado={handleEstadoCambiado}
          />
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
