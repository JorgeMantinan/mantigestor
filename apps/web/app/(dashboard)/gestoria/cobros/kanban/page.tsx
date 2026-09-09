'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { ArrowUpRight, Landmark, Clock, AlertTriangle, CheckCircle, TrendingUp } from 'lucide-react'
import { toast, Toaster } from 'sonner'
import { formatoMoneda } from '@/lib/divisas'
import { logAccion } from '@/lib/audit-log'

interface Factura {
  id: string
  numero: string
  tipo: string
  emisorReceptor: string
  nifContraparte: string | null
  fechaEmision: string
  fechaVencimiento: string | null
  baseImponible: number
  iva: number
  total: number
  estado: string
}

type ColumnaId = 'pendiente' | 'enviado' | 'en_proceso' | 'pagado'

interface Columna {
  id: ColumnaId
  titulo: string
  icono: React.ReactNode
  bgHeader: string
  bgBody: string
  border: string
  estadoFactura: string[]
}

const COLUMNAS: Columna[] = [
  {
    id: 'pendiente',
    titulo: 'Pendiente',
    icono: <Clock className="h-4 w-4" aria-hidden="true" />,
    bgHeader: 'bg-gray-500',
    bgBody: 'bg-gray-50 dark:bg-gray-900/30',
    border: 'border-gray-200 dark:border-gray-700',
    estadoFactura: ['pendiente'],
  },
  {
    id: 'enviado',
    titulo: 'Enviado',
    icono: <TrendingUp className="h-4 w-4" aria-hidden="true" />,
    bgHeader: 'bg-blue-500',
    bgBody: 'bg-blue-50 dark:bg-blue-950/30',
    border: 'border-blue-200 dark:border-blue-800',
    estadoFactura: ['enviada'],
  },
  {
    id: 'en_proceso',
    titulo: 'En proceso',
    icono: <AlertTriangle className="h-4 w-4" aria-hidden="true" />,
    bgHeader: 'bg-yellow-500',
    bgBody: 'bg-yellow-50 dark:bg-yellow-950/30',
    border: 'border-yellow-200 dark:border-yellow-800',
    estadoFactura: ['en_proceso'],
  },
  {
    id: 'pagado',
    titulo: 'Pagado',
    icono: <CheckCircle className="h-4 w-4" aria-hidden="true" />,
    bgHeader: 'bg-green-500',
    bgBody: 'bg-green-50 dark:bg-green-950/30',
    border: 'border-green-200 dark:border-green-800',
    estadoFactura: ['pagada', 'parcial'],
  },
]

function columnaParaEstado(col: ColumnaId): string {
  switch (col) {
    case 'enviado': return 'enviada'
    case 'en_proceso': return 'en_proceso'
    case 'pagado': return 'pagada'
    default: return 'pendiente'
  }
}

function estadoAColumna(estado: string): ColumnaId {
  switch (estado) {
    case 'enviada': return 'enviado'
    case 'en_proceso': return 'en_proceso'
    case 'pagada': case 'parcial': return 'pagado'
    default: return 'pendiente'
  }
}

function diasHasta(fecha: string): number {
  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)
  const target = new Date(fecha)
  target.setHours(0, 0, 0, 0)
  return Math.ceil((target.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24))
}

function colorBadge(fechaVencimiento: string | null, estado: string): string {
  if (estado === 'pagada' || estado === 'parcial') return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
  if (!fechaVencimiento) return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
  const dias = diasHasta(fechaVencimiento)
  if (dias < 0) return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
  if (dias <= 7) return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
  return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
}

function textoBadge(fechaVencimiento: string | null, estado: string): string {
  if (estado === 'pagada') return 'Pagada'
  if (estado === 'parcial') return 'Parcial'
  if (!fechaVencimiento) return 'Sin fecha'
  const dias = diasHasta(fechaVencimiento)
  if (dias < 0) return `${Math.abs(dias)}d vencida`
  if (dias === 0) return 'Vence hoy'
  if (dias <= 7) return `${dias}d restantes`
  return `${dias}d`
}

export default function KanbanCobrosPage() {
  const [facturas, setFacturas] = useState<Factura[]>([])
  const [loading, setLoading] = useState(true)
  const [dragId, setDragId] = useState<string | null>(null)
  const [overCol, setOverCol] = useState<ColumnaId | null>(null)

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

  const agrupadas = useMemo(() => {
    const mapa: Record<ColumnaId, Factura[]> = { pendiente: [], enviado: [], en_proceso: [], pagado: [] }
    for (const f of facturas) {
      const col = estadoAColumna(f.estado)
      mapa[col].push(f)
    }
    return mapa
  }, [facturas])

  const totales = useMemo(() => {
    const res: Record<ColumnaId, number> = { pendiente: 0, enviado: 0, en_proceso: 0, pagado: 0 }
    for (const f of facturas) {
      const col = estadoAColumna(f.estado)
      res[col] += f.total
    }
    return res
  }, [facturas])

  const totalPendiente = useMemo(() =>
    facturas.filter(f => f.estado === 'pendiente').reduce((s, f) => s + f.total, 0)
  , [facturas])

  const totalVencidas = useMemo(() => {
    const hoy = new Date()
    hoy.setHours(0, 0, 0, 0)
    return facturas
      .filter(f => f.estado !== 'pagada' && f.estado !== 'parcial' && f.fechaVencimiento && new Date(f.fechaVencimiento) < hoy)
      .reduce((s, f) => s + f.total, 0)
  }, [facturas])

  const cobradoMes = useMemo(() => {
    const now = new Date()
    const mesActual = now.getMonth()
    const anyoActual = now.getFullYear()
    return facturas
      .filter(f => {
        if (f.estado !== 'pagada' && f.estado !== 'parcial') return false
        const d = new Date(f.fechaEmision)
        return d.getMonth() === mesActual && d.getFullYear() === anyoActual
      })
      .reduce((s, f) => s + f.total, 0)
  }, [facturas])

  const formatMoney = (cents: number) => formatoMoneda(cents / 100, 'EUR')

  const handleDragStart = useCallback((e: React.DragEvent, facturaId: string) => {
    setDragId(facturaId)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', facturaId)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent, colId: ColumnaId) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setOverCol(colId)
  }, [])

  const handleDragLeave = useCallback(() => { setOverCol(null) }, [])

  const handleDrop = useCallback(async (e: React.DragEvent, colDestino: ColumnaId) => {
    e.preventDefault()
    const facturaId = e.dataTransfer.getData('text/plain')
    if (!facturaId) { setDragId(null); setOverCol(null); return }

    const factura = facturas.find(f => f.id === facturaId)
    if (factura && estadoAColumna(factura.estado) !== colDestino) {
      const nuevoEstado = columnaParaEstado(colDestino)
      const supabase = createClient()
      const { error } = await supabase
        .from('facturas')
        .update({ estado: nuevoEstado })
        .eq('id', facturaId)
      if (error) {
        toast.error('Error al cambiar estado')
      } else {
        await logAccion('cambio_estado', 'factura', facturaId, `Estado → ${nuevoEstado}`)
        setFacturas(prev => prev.map(f => f.id === facturaId ? { ...f, estado: nuevoEstado } : f))
        toast.success(`Factura movida a "${COLUMNAS.find(c => c.id === colDestino)?.titulo}"`)
      }
    }
    setDragId(null)
    setOverCol(null)
  }, [facturas])

  const handleDragEnd = useCallback(() => { setDragId(null); setOverCol(null) }, [])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-heading font-bold tracking-tight">Kanban de Cobros</h1>
        <p className="text-muted-foreground">Arrastra las facturas entre columnas para actualizar su estado</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="flex items-center gap-3 py-3">
            <div className="rounded-lg bg-gray-100 dark:bg-gray-800 p-2">
              <Clock className="h-4 w-4 text-gray-600 dark:text-gray-400" aria-hidden="true" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Pendiente total</p>
              <p className="text-sm font-semibold">{formatMoney(totalPendiente)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 py-3">
            <div className="rounded-lg bg-red-100 dark:bg-red-800 p-2">
              <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" aria-hidden="true" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Vencidas</p>
              <p className="text-sm font-semibold">{formatMoney(totalVencidas)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 py-3">
            <div className="rounded-lg bg-green-100 dark:bg-green-800 p-2">
              <Landmark className="h-4 w-4 text-green-600 dark:text-green-400" aria-hidden="true" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Cobrado este mes</p>
              <p className="text-sm font-semibold">{formatMoney(cobradoMes)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {loading ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground">Cargando facturas...</CardContent></Card>
      ) : facturas.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-12">
            <Landmark className="h-12 w-12 text-muted-foreground" />
            <div className="text-center">
              <p className="font-medium">No hay facturas emitidas</p>
              <p className="text-sm text-muted-foreground">Crea facturas de tipo &quot;ingreso&quot; para usar el Kanban</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {COLUMNAS.map(col => (
            <div
              key={col.id}
              className={`flex flex-col rounded-lg border ${col.border} ${
                overCol === col.id ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : ''
              }`}
              onDragOver={e => handleDragOver(e, col.id)}
              onDragLeave={handleDragLeave}
              onDrop={e => handleDrop(e, col.id)}
            >
              <div className={`flex items-center justify-between px-3 py-2 rounded-t-lg ${col.bgHeader} text-white`}>
                <div className="flex items-center gap-2">
                  {col.icono}
                  <span className="text-sm font-medium">{col.titulo}</span>
                </div>
                <Badge variant="secondary" className="text-xs bg-white/20 text-white border-0">
                  {agrupadas[col.id].length}
                </Badge>
              </div>

              <div className={`flex-1 p-2 space-y-2 min-h-[200px] max-h-[500px] overflow-y-auto ${col.bgBody}`}>
                {agrupadas[col.id].length === 0 ? (
                  <div className="text-center text-xs text-muted-foreground py-8">
                    Sin facturas
                  </div>
                ) : (
                  agrupadas[col.id].map(f => (
                    <Card
                      key={f.id}
                      draggable
                      onDragStart={e => handleDragStart(e, f.id)}
                      onDragEnd={handleDragEnd}
                      className={`cursor-grab active:cursor-grabbing transition-all ${
                        dragId === f.id ? 'opacity-40 scale-[0.98]' : ''
                      } hover:shadow-md`}
                    >
                      <CardContent className="p-3 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium truncate">{f.emisorReceptor}</p>
                            <p className="text-xs text-muted-foreground">{f.numero}</p>
                          </div>
                          <Link
                            href={`/gestoria/facturas/${f.id}`}
                            className="shrink-0 text-muted-foreground hover:text-foreground"
                            onClick={e => e.stopPropagation()}
                          >
                            <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                          </Link>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-semibold">{formatMoney(f.total)}</span>
                          <Badge className={`text-[10px] px-1.5 py-0 ${colorBadge(f.fechaVencimiento, f.estado)}`}>
                            {textoBadge(f.fechaVencimiento, f.estado)}
                          </Badge>
                        </div>
                        <p className="text-[10px] text-muted-foreground">
                          {new Date(f.fechaEmision).toLocaleDateString('es-ES')}
                        </p>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>

              <div className={`px-3 py-2 border-t ${col.border} rounded-b-lg`}>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Total</span>
                  <span className="text-sm font-semibold">{formatMoney(totales[col.id])}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      <Toaster richColors position="top-right" />
    </div>
  )
}
