'use client'

import { useState, useCallback, useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import { formatoMoneda } from '@/lib/divisas'

interface Factura {
  id: string
  numero: string
  tipo: string
  emisorReceptor: string
  fechaEmision: string
  total: number
  estado: string
}

type ColumnaKanban = 'pendiente' | 'en_proceso' | 'parcial' | 'cobrado'

interface Columna {
  id: ColumnaKanban
  titulo: string
  color: string
  bgHeader: string
  bgBadge: string
  textBadge: string
  border: string
}

const COLUMNAS: Columna[] = [
  {
    id: 'pendiente',
    titulo: 'Pendiente',
    color: 'bg-gray-100 dark:bg-gray-900/30',
    bgHeader: 'bg-gray-500',
    bgBadge: 'bg-gray-100 dark:bg-gray-800',
    textBadge: 'text-gray-700 dark:text-gray-300',
    border: 'border-gray-200 dark:border-gray-700',
  },
  {
    id: 'en_proceso',
    titulo: 'En proceso',
    color: 'bg-blue-50 dark:bg-blue-950/30',
    bgHeader: 'bg-blue-500',
    bgBadge: 'bg-blue-100 dark:bg-blue-900',
    textBadge: 'text-blue-700 dark:text-blue-300',
    border: 'border-blue-200 dark:border-blue-800',
  },
  {
    id: 'parcial',
    titulo: 'Cobrado parcialmente',
    color: 'bg-yellow-50 dark:bg-yellow-950/30',
    bgHeader: 'bg-yellow-500',
    bgBadge: 'bg-yellow-100 dark:bg-yellow-900',
    textBadge: 'text-yellow-700 dark:text-yellow-300',
    border: 'border-yellow-200 dark:border-yellow-800',
  },
  {
    id: 'cobrado',
    titulo: 'Cobrado',
    color: 'bg-green-50 dark:bg-green-950/30',
    bgHeader: 'bg-green-500',
    bgBadge: 'bg-green-100 dark:bg-green-900',
    textBadge: 'text-green-700 dark:text-green-300',
    border: 'border-green-200 dark:border-green-800',
  },
]

function mapearEstado(estado: string): ColumnaKanban {
  switch (estado) {
    case 'pagada': return 'cobrado'
    case 'parcial': return 'parcial'
    case 'en_proceso': return 'en_proceso'
    default: return 'pendiente'
  }
}

function columnaParaDrag(estado: string): ColumnaKanban {
  switch (estado) {
    case 'pagada': return 'cobrado'
    case 'parcial': return 'parcial'
    case 'en_proceso': return 'en_proceso'
    default: return 'pendiente'
  }
}

function estadoDesdeColumna(col: ColumnaKanban): string {
  switch (col) {
    case 'cobrado': return 'pagada'
    case 'parcial': return 'parcial'
    case 'en_proceso': return 'en_proceso'
    default: return 'pendiente'
  }
}

function diasTranscurridos(fecha: string): number {
  const hoy = new Date()
  const emision = new Date(fecha)
  const diff = hoy.getTime() - emision.getTime()
  return Math.floor(diff / (1000 * 60 * 60 * 24))
}

interface KanbanCobrosProps {
  facturas: Factura[]
  onEstadoCambiado?: (facturaId: string, nuevoEstado: string) => void
}

export function KanbanCobros({ facturas, onEstadoCambiado }: KanbanCobrosProps) {
  const [dragId, setDragId] = useState<string | null>(null)
  const [overCol, setOverCol] = useState<ColumnaKanban | null>(null)

  const agrupadas = useMemo(() => {
    const mapa: Record<ColumnaKanban, Factura[]> = {
      pendiente: [],
      en_proceso: [],
      parcial: [],
      cobrado: [],
    }
    for (const f of facturas) {
      const col = mapearEstado(f.estado)
      mapa[col].push(f)
    }
    return mapa
  }, [facturas])

  const totales = useMemo(() => {
    const res: Record<ColumnaKanban, number> = {
      pendiente: 0,
      en_proceso: 0,
      parcial: 0,
      cobrado: 0,
    }
    for (const f of facturas) {
      const col = mapearEstado(f.estado)
      res[col] += f.total
    }
    return res
  }, [facturas])

  const handleDragStart = useCallback((e: React.DragEvent, facturaId: string) => {
    setDragId(facturaId)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', facturaId)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent, colId: ColumnaKanban) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setOverCol(colId)
  }, [])

  const handleDragLeave = useCallback(() => {
    setOverCol(null)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent, colDestino: ColumnaKanban) => {
    e.preventDefault()
    const facturaId = e.dataTransfer.getData('text/plain')
    if (!facturaId) {
      setDragId(null)
      setOverCol(null)
      return
    }
    const factura = facturas.find(f => f.id === facturaId)
    if (factura) {
      const colActual = columnaParaDrag(factura.estado)
      if (colActual !== colDestino) {
        onEstadoCambiado?.(facturaId, estadoDesdeColumna(colDestino))
      }
    }
    setDragId(null)
    setOverCol(null)
  }, [facturas, onEstadoCambiado])

  const handleDragEnd = useCallback(() => {
    setDragId(null)
    setOverCol(null)
  }, [])

  const formatMoney = (cents: number) => formatoMoneda(cents / 100, 'EUR')

  return (
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
            <span className="text-sm font-medium">{col.titulo}</span>
            <Badge variant="secondary" className="text-xs bg-white/20 text-white border-0">
              {agrupadas[col.id].length}
            </Badge>
          </div>

          <div className="flex-1 p-2 space-y-2 min-h-[200px] max-h-[500px] overflow-y-auto">
            {agrupadas[col.id].length === 0 ? (
              <div className="text-center text-xs text-muted-foreground py-8">
                Sin facturas
              </div>
            ) : (
              agrupadas[col.id].map(f => {
                const dias = diasTranscurridos(f.fechaEmision)
                return (
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
                        <span className="text-[10px] text-muted-foreground">
                          {dias}d
                        </span>
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        {new Date(f.fechaEmision).toLocaleDateString('es-ES')}
                      </p>
                    </CardContent>
                  </Card>
                )
              })
            )}
          </div>

          <div className={`px-3 py-2 border-t ${col.border} ${col.color} rounded-b-lg`}>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Total</span>
              <span className="text-sm font-semibold">{formatMoney(totales[col.id])}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
