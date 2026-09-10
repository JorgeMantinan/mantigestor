'use client'

import { useState, useMemo, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Send, Check, Clock, AlertTriangle, Search, Filter, Mail, MailCheck } from 'lucide-react'
import { useLanguage } from '@/contexts/language-context'
import { usePersonaActiva } from '@/contexts/persona-activa-context'
import { createClient } from '@/lib/supabase/client'

interface FacturaEnvio {
  id: string
  numero: string
  emisorReceptor: string
  nifContraparte: string | null
  fechaEmision: string
  baseImponible: number
  iva: number
  total: number
  tipo: string
  estado: string
  enviada: boolean
  pagada: boolean
}

const STORAGE_KEY_ENVIOS = 'mantigestor_envios_facturas'

function formatEuro(v: number): string {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(v / 100)
}

function diasDesde(fecha: string): number {
  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)
  const d = new Date(fecha + 'T00:00:00')
  return Math.floor((hoy.getTime() - d.getTime()) / (1000 * 60 * 60 * 24))
}

export default function ControlEnviosPage() {
  const { t } = useLanguage()
  const { perfilActivoId } = usePersonaActiva()
  const [facturas, setFacturas] = useState<FacturaEnvio[]>([])
  const [cargando, setCargando] = useState(true)
  const [filtro, setFiltro] = useState<'todas' | 'pendientes' | 'enviadas' | 'pagadas'>('pendientes')
  const [busqueda, setBusqueda] = useState('')
  const [estadosEnvio, setEstadosEnvio] = useState<Record<string, { enviada: boolean; pagada: boolean }>>(() => {
    if (typeof window === 'undefined') return {}
    try {
      const raw = localStorage.getItem(STORAGE_KEY_ENVIOS)
      return raw ? JSON.parse(raw) : {}
    } catch {
      return {}
    }
  })

  useEffect(() => {
    if (!perfilActivoId) return
    createClient()
      .from('facturas')
      .select('id, numero, emisorReceptor, nifContraparte, fechaEmision, baseImponible, iva, total, tipo, estado')
      .eq('perfilId', perfilActivoId)
      .eq('tipo', 'emitida')
      .order('fechaEmision', { ascending: false })
      .then(({ data }) => {
        setFacturas((data ?? []) as FacturaEnvio[])
        setCargando(false)
      })
  }, [perfilActivoId])

  const guardarEstado = (facturaId: string, campo: 'enviada' | 'pagada', valor: boolean) => {
    setEstadosEnvio(prev => {
      const actual = prev[facturaId] ?? { enviada: false, pagada: false }
      const nuevo = { ...actual, [campo]: valor }
      const nuevos = { ...prev, [facturaId]: nuevo }
      localStorage.setItem(STORAGE_KEY_ENVIOS, JSON.stringify(nuevos))
      return nuevos
    })
  }

  const facturasConEstado = useMemo(() => {
    return facturas.map(f => ({
      ...f,
      enviada: estadosEnvio[f.id]?.enviada ?? false,
      pagada: estadosEnvio[f.id]?.pagada ?? false,
    }))
  }, [facturas, estadosEnvio])

  const facturasFiltradas = useMemo(() => {
    let lista = facturasConEstado
    if (filtro === 'pendientes') lista = lista.filter(f => !f.enviada && !f.pagada)
    else if (filtro === 'enviadas') lista = lista.filter(f => f.enviada && !f.pagada)
    else if (filtro === 'pagadas') lista = lista.filter(f => f.pagada)

    if (busqueda.trim()) {
      const q = busqueda.toLowerCase()
      lista = lista.filter(f =>
        f.numero?.toLowerCase().includes(q) ||
        f.emisorReceptor?.toLowerCase().includes(q) ||
        f.nifContraparte?.toLowerCase().includes(q)
      )
    }
    return lista
  }, [facturasConEstado, filtro, busqueda])

  const stats = useMemo(() => {
    const total = facturasConEstado.length
    const enviadas = facturasConEstado.filter(f => f.enviada && !f.pagada).length
    const pagadas = facturasConEstado.filter(f => f.pagada).length
    const pendientes = total - enviadas - pagadas
    const pendientesAntiguos = facturasConEstado
      .filter(f => !f.enviada && !f.pagada)
      .filter(f => diasDesde(f.fechaEmision) > 7)
    return { total, enviadas, pagadas, pendientes, pendientesAntiguos: pendientesAntiguos.length }
  }, [facturasConEstado])

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">¿Ya enviaste la factura?</h1>
        <p className="text-muted-foreground">Controla el envío y cobro de tus facturas emitidas</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total facturas</CardDescription>
          </CardHeader>
          <CardContent>
            <span className="text-2xl font-bold">{stats.total}</span>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Pendientes envío</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-orange-500" />
              <span className="text-2xl font-bold text-orange-600">{stats.pendientes}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Enviadas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Send className="h-5 w-5 text-blue-600" />
              <span className="text-2xl font-bold text-blue-600">{stats.enviadas}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Pagadas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Check className="h-5 w-5 text-green-600" />
              <span className="text-2xl font-bold text-green-600">{stats.pagadas}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {stats.pendientesAntiguos > 0 && (
        <div className="rounded-lg border border-orange-200 bg-orange-50 p-4 dark:bg-orange-950 dark:border-orange-800">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-orange-500" />
            <p className="text-sm font-medium text-orange-800 dark:text-orange-200">
              {stats.pendientesAntiguos} factura(s) pendientes de envío hace más de 7 días
            </p>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-1">
          {(['todas', 'pendientes', 'enviadas', 'pagadas'] as const).map(f => (
            <Button
              key={f}
              variant={filtro === f ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setFiltro(f)}
            >
              {f === 'todas' ? 'Todas' : f === 'pendientes' ? 'Pendientes' : f === 'enviadas' ? 'Enviadas' : 'Pagadas'}
            </Button>
          ))}
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por número, cliente..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          {cargando ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-16 bg-muted animate-pulse rounded" />
              ))}
            </div>
          ) : facturasFiltradas.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              {filtro === 'pendientes' ? 'No hay facturas pendientes de envío' : 'No se encontraron facturas'}
            </p>
          ) : (
            <div className="space-y-2">
              {facturasFiltradas.map(f => {
                const dias = diasDesde(f.fechaEmision)
                const estadoColor = f.pagada
                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                  : f.enviada
                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                  : dias > 7
                  ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                  : 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'

                return (
                  <div
                    key={f.id}
                    className="flex items-center justify-between rounded-lg border p-3 text-sm transition-opacity"
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{f.numero || 'Sin número'}</span>
                          <Badge variant="secondary" className={`text-xs ${estadoColor}`}>
                            {f.pagada ? 'Pagada' : f.enviada ? 'Enviada' : 'Pendiente'}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {f.emisorReceptor} {f.nifContraparte ? `• ${f.nifContraparte}` : ''}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 shrink-0">
                      <div className="text-right hidden sm:block">
                        <p className="font-medium">{formatEuro(f.total)}</p>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {dias} día{dias !== 1 ? 's' : ''} · {f.fechaEmision}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        {!f.enviada && !f.pagada && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => guardarEstado(f.id, 'enviada', true)}
                            title="Marcar como enviada"
                          >
                            <MailCheck className="h-3 w-3 mr-1" /> Enviar
                          </Button>
                        )}
                        {f.enviada && !f.pagada && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => guardarEstado(f.id, 'pagada', true)}
                            title="Marcar como pagada"
                          >
                            <Check className="h-3 w-3 mr-1" /> Cobrar
                          </Button>
                        )}
                        {f.pagada && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => guardarEstado(f.id, 'pagada', false)}
                          >
                            Reabrir
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
