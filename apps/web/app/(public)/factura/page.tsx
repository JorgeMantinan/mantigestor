'use client'

import { useState, useEffect, useMemo, use } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { FileText, ChevronDown, ChevronUp } from 'lucide-react'

interface FacturaPublica {
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
  notas: string | null
}

const formatEuro = (cents: number) =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(cents / 100)

type FiltroEstado = 'todas' | 'pendiente' | 'pagada'

export default function FacturaPublicaPage(props: { searchParams: Promise<{ token?: string }> }) {
  const searchParams = use(props.searchParams)
  const [facturas, setFacturas] = useState<FacturaPublica[]>([])
  const [, setTokenCliente] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(true)
  const [filtro, setFiltro] = useState<FiltroEstado>('todas')
  const [expandida, setExpandida] = useState<string | null>(null)

  useEffect(() => {
    const ctrl = new AbortController()
    const cargar = async () => {
      if (!searchParams.token) {
        setError('Token no proporcionado')
        setCargando(false)
        return
      }
      try {
        const res = await fetch(`/api/cliente-portal?token=${searchParams.token}`, { signal: ctrl.signal })
        if (!res.ok) {
          const err = await res.json()
          setError(err.error || 'Error al cargar facturas')
          setCargando(false)
          return
        }
        const data = await res.json()
        setFacturas(data.facturas || [])
        setTokenCliente(data.tokenCliente)
      } catch (e) {
        if ((e as Error)?.name === 'AbortError') return
        setError('Error al conectar con el servidor')
      }
      setCargando(false)
    }
    cargar()
    return () => ctrl.abort()
  }, [searchParams.token])

  const facturasFiltradas = useMemo(() => {
    if (filtro === 'todas') return facturas
    return facturas.filter((f) => f.estado === filtro)
  }, [facturas, filtro])

  const resumen = useMemo(() => {
    const totalBase = facturas.reduce((s, f) => s + f.baseImponible, 0)
    const totalIva = facturas.reduce((s, f) => s + (f.baseImponible * f.iva) / 100, 0)
    const totalGeneral = facturas.reduce((s, f) => s + f.total, 0)
    const pendientes = facturas.filter((f) => f.estado === 'pendiente').length
    const pagadas = facturas.filter((f) => f.estado === 'pagada').length
    return { totalBase, totalIva, totalGeneral, pendientes, pagadas }
  }, [facturas])

  if (cargando) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Cargando facturas...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <Card className="max-w-md w-full">
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
            <p className="text-lg font-medium">Facturas no encontradas</p>
            <p className="text-sm text-muted-foreground mt-2">{error}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (facturas.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <Card className="max-w-md w-full">
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
            <p className="text-lg font-medium">Sin facturas</p>
            <p className="text-sm text-muted-foreground mt-2">No hay facturas disponibles para este enlace</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-muted/30 py-8 px-4 sm:py-12">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold">Portal de Facturas</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {facturas[0]?.emisorReceptor}
            {facturas[0]?.nifContraparte && ` — NIF: ${facturas[0].nifContraparte}`}
          </p>
        </div>

        {/* Resumen */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card>
            <CardContent className="py-3 px-4 text-center">
              <p className="text-xs text-muted-foreground">Total facturas</p>
              <p className="text-xl font-bold">{facturas.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-3 px-4 text-center">
              <p className="text-xs text-muted-foreground">Pendientes</p>
              <p className="text-xl font-bold text-amber-600">{resumen.pendientes}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-3 px-4 text-center">
              <p className="text-xs text-muted-foreground">Pagadas</p>
              <p className="text-xl font-bold text-emerald-600">{resumen.pagadas}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-3 px-4 text-center">
              <p className="text-xs text-muted-foreground">Importe total</p>
              <p className="text-xl font-bold">{formatEuro(resumen.totalGeneral)}</p>
            </CardContent>
          </Card>
        </div>

        {/* Filtros */}
        <div className="flex gap-2 flex-wrap">
          {(['todas', 'pendiente', 'pagada'] as FiltroEstado[]).map((f) => (
            <button
              key={f}
              onClick={() => setFiltro(f)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                filtro === f
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {f === 'todas' ? `Todas (${facturas.length})` : f === 'pendiente' ? `Pendientes (${resumen.pendientes})` : `Pagadas (${resumen.pagadas})`}
            </button>
          ))}
        </div>

        {/* Lista de facturas */}
        <div className="space-y-3">
          {facturasFiltradas.map((f) => {
            const isOpen = expandida === f.id
            return (
              <Card key={f.id} className="overflow-hidden">
                <button
                  className="w-full text-left"
                  onClick={() => setExpandida(isOpen ? null : f.id)}
                >
                  <div className="flex items-center justify-between p-4 gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm">{f.numero}</span>
                        <Badge variant={f.estado === 'pagada' ? 'default' : 'secondary'} className="text-xs">
                          {f.estado}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(f.fechaEmision).toLocaleDateString('es-ES', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-bold text-sm">{formatEuro(f.total)}</p>
                      {f.fechaVencimiento && f.estado === 'pendiente' && (
                        <p className="text-xs text-muted-foreground">
                          Vence: {new Date(f.fechaVencimiento).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                        </p>
                      )}
                    </div>
                    {isOpen ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                    )}
                  </div>
                </button>

                {isOpen && (
                  <div className="border-t px-4 pb-4 pt-3 space-y-3">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-1.5 text-xs text-muted-foreground">Concepto</th>
                          <th className="text-right py-1.5 text-xs text-muted-foreground">Base</th>
                          <th className="text-right py-1.5 text-xs text-muted-foreground">IVA</th>
                          <th className="text-right py-1.5 text-xs text-muted-foreground">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="py-1.5">{f.emisorReceptor}</td>
                          <td className="text-right py-1.5">{formatEuro(f.baseImponible)}</td>
                          <td className="text-right py-1.5">{f.iva}%</td>
                          <td className="text-right py-1.5 font-bold">{formatEuro(f.total)}</td>
                        </tr>
                      </tbody>
                    </table>
                    {f.notas && (
                      <div className="rounded-lg bg-muted p-2.5">
                        <p className="text-xs text-muted-foreground mb-0.5">Notas</p>
                        <p className="text-sm">{f.notas}</p>
                      </div>
                    )}
                  </div>
                )}
              </Card>
            )
          })}
        </div>

        {facturasFiltradas.length === 0 && (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-sm text-muted-foreground">No hay facturas con el filtro seleccionado</p>
            </CardContent>
          </Card>
        )}

        {/* Footer */}
        <div className="text-center text-xs text-muted-foreground pt-4 border-t">
          Documentos generados por MantiGestor
        </div>
      </div>
    </div>
  )
}
