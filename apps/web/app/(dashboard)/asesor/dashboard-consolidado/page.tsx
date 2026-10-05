'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { usePersonaActiva } from '@/contexts/persona-activa-context'
import { Search, Users, ArrowUpRight, Clock, AlertCircle, CheckCircle, Mail, Download, RefreshCw, Calendar, FileText, TrendingUp, TrendingDown } from 'lucide-react'
import { formatoMoneda } from '@/lib/divisas'
import type { PersonaDashboard } from '@/app/api/fiscal/asesor/dashboard/route'

type FiltroEstado = 'todos' | 'con_plazos' | 'con_atraso'

export default function DashboardConsolidadoPage() {
  const { personas } = usePersonaActiva()
  const [datos, setDatos] = useState<PersonaDashboard[]>([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [filtro, setFiltro] = useState<FiltroEstado>('todos')
  const [orden, setOrden] = useState<'nombre' | 'vencimiento' | 'pendientes'>('nombre')

  const clientesGestionados = personas.filter(p => p.tipo === 'gestiono')

  useEffect(() => {
    const ctrl = new AbortController()
    async function cargarDatos() {
      setLoading(true)
      try {
        const res = await fetch('/api/fiscal/asesor/dashboard', { signal: ctrl.signal })
        if (res.ok) {
          const data = await res.json()
          setDatos(data.personas ?? [])
        }
      } catch {
        // Silenciar errores
      } finally {
        setLoading(false)
      }
    }
    if (clientesGestionados.length > 0) {
      void cargarDatos()
    } else {
      setLoading(false)
    }
    return () => ctrl.abort()
  }, [clientesGestionados.length])

  const hoy = new Date()

  function diasHasta(fecha: string | null): number | null {
    if (!fecha) return null
    const d = new Date(fecha)
    return Math.ceil((d.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24))
  }

  function colorEstado(p: PersonaDashboard): string {
    if (p.facturasVencidas > 0) return 'border-red-500 bg-red-500/5'
    if (p.modelosPendientes.length > 0) return 'border-yellow-500 bg-yellow-500/5'
    const dias = diasHasta(p.proximoVencimiento)
    if (dias !== null && dias <= 15) return 'border-yellow-500 bg-yellow-500/5'
    return 'border-green-500 bg-green-500/5'
  }

  function badgeEstado(p: PersonaDashboard) {
    if (p.facturasVencidas > 0) {
      return <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">Vencidas</Badge>
    }
    if (p.modelosPendientes.length > 0) {
      return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">Pendiente</Badge>
    }
    return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Al día</Badge>
  }

  const filtrados = datos
    .filter(p => {
      const coincideBusqueda =
        (p.nombre?.toLowerCase().includes(busqueda.toLowerCase())) ||
        p.email.toLowerCase().includes(busqueda.toLowerCase()) ||
        (p.nif?.toLowerCase().includes(busqueda.toLowerCase()))
      if (!coincideBusqueda) return false
      if (filtro === 'con_plazos') return p.modelosPendientes.length > 0 || p.facturasPendientes > 0
      if (filtro === 'con_atraso') return p.facturasVencidas > 0
      return true
    })
    .sort((a, b) => {
      if (orden === 'nombre') return (a.nombre ?? a.email).localeCompare(b.nombre ?? b.email)
      if (orden === 'vencimiento') {
        const da = diasHasta(a.proximoVencimiento) ?? 9999
        const db = diasHasta(b.proximoVencimiento) ?? 9999
        return da - db
      }
      const totalA = a.modelosPendientes.length + a.facturasPendientes + a.facturasVencidas
      const totalB = b.modelosPendientes.length + b.facturasPendientes + b.facturasVencidas
      return totalB - totalA
    })

  const totalPendientes = datos.reduce((s, p) => s + p.modelosPendientes.length, 0)
  const totalFacturasVencidas = datos.reduce((s, p) => s + p.facturasVencidas, 0)
  const totalFacturasPendientes = datos.reduce((s, p) => s + p.facturasPendientes, 0)
  const totalAlDia = datos.filter(p => p.facturasVencidas === 0 && p.modelosPendientes.length === 0).length

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-heading font-bold tracking-tight">Dashboard Consolidado</h1>
          <p className="text-muted-foreground">Vista completa de todos los clientes que gestionas</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => void window.location.reload()}>
            <RefreshCw className="h-4 w-4 mr-1" aria-hidden="true" />
            Actualizar
          </Button>
        </div>
      </div>

      {clientesGestionados.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-12">
            <Users className="h-12 w-12 text-muted-foreground" />
            <div className="text-center">
              <p className="font-medium">No gestionas ningún cliente</p>
              <p className="text-sm text-muted-foreground">
                Asocia personas desde Ajustes &gt; Personas para acceder al dashboard consolidado.
              </p>
            </div>
            <Link href="/ajustes/personas">
              <Button>Gestionar personas</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Users className="h-4 w-4 text-primary" />
                  Total clientes
                </div>
                <p className="mt-1 text-2xl font-bold">{datos.length}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  Al día
                </div>
                <p className="mt-1 text-2xl font-bold text-green-600">{totalAlDia}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4 text-yellow-600" />
                  Pendientes
                </div>
                <p className="mt-1 text-2xl font-bold text-yellow-600">{totalPendientes + totalFacturasPendientes}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  Vencidas
                </div>
                <p className="mt-1 text-2xl font-bold text-red-600">{totalFacturasVencidas}</p>
              </CardContent>
            </Card>
          </div>

          {/* Filtros y búsqueda */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <Input
                placeholder="Buscar por nombre, email o NIF..."
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant={filtro === 'todos' ? 'secondary' : 'outline'}
                size="sm"
                onClick={() => setFiltro('todos')}
              >
                Todos
              </Button>
              <Button
                variant={filtro === 'con_plazos' ? 'secondary' : 'outline'}
                size="sm"
                onClick={() => setFiltro('con_plazos')}
              >
                <Clock className="h-3 w-3 mr-1" aria-hidden="true" />
                Pendientes
              </Button>
              <Button
                variant={filtro === 'con_atraso' ? 'secondary' : 'outline'}
                size="sm"
                onClick={() => setFiltro('con_atraso')}
              >
                <AlertCircle className="h-3 w-3 mr-1" aria-hidden="true" />
                Vencidas
              </Button>
            </div>
            <select
              value={orden}
              onChange={e => setOrden(e.target.value as typeof orden)}
              className="flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
            >
              <option value="nombre">Ordenar: Nombre</option>
              <option value="vencimiento">Ordenar: Próximo vencimiento</option>
              <option value="pendientes">Ordenar: Más pendientes</option>
            </select>
          </div>

          {loading ? (
            <p className="text-muted-foreground">Cargando datos de clientes...</p>
          ) : (
            <div className="space-y-3">
              {filtrados.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    No se encontraron clientes con los filtros seleccionados.
                  </CardContent>
                </Card>
              ) : (
                filtrados.map(persona => {
                  const dias = diasHasta(persona.proximoVencimiento)
                  return (
                    <Card key={persona.perfilId} className={`border-l-4 ${colorEstado(persona)} hover:shadow-md transition-shadow`}>
                      <CardContent className="p-4">
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                          {/* Info del cliente */}
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-sm shrink-0">
                              {(persona.nombre ?? persona.email).slice(0, 2).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-medium truncate">{persona.nombre || persona.email}</span>
                                {badgeEstado(persona)}
                                {persona.suscripcionTier && (
                                  <Badge variant="outline" className="text-xs">{persona.suscripcionTier}</Badge>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground truncate">
                                {persona.email}
                                {persona.nif && ` · NIF: ${persona.nif}`}
                              </p>
                            </div>
                          </div>

                          {/* Métricas */}
                          <div className="flex flex-wrap items-center gap-4 text-sm">
                            {/* Próximo vencimiento */}
                            <div className="flex items-center gap-1.5">
                              <Calendar className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                              <span className={`font-medium ${dias !== null && dias <= 15 ? 'text-yellow-600' : ''}`}>
                                {persona.proximoVencimiento
                                  ? new Date(persona.proximoVencimiento).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
                                  : 'Sin fecha'}
                              </span>
                              {dias !== null && (
                                <span className="text-xs text-muted-foreground">
                                  {dias === 0 ? 'Hoy' : dias === 1 ? 'Mañana' : `${dias} días`}
                                </span>
                              )}
                            </div>

                            {/* Modelos pendientes */}
                            {persona.modelosPendientes.length > 0 && (
                              <div className="flex items-center gap-1.5">
                                <FileText className="h-4 w-4 text-yellow-600" aria-hidden="true" />
                                <span className="text-yellow-600 font-medium">
                                  {persona.modelosPendientes.join(', ')}
                                </span>
                              </div>
                            )}

                            {/* Facturas */}
                            <div className="flex items-center gap-1.5">
                              <TrendingUp className="h-3 w-3 text-green-600" aria-hidden="true" />
                              <span className="text-green-600">{formatoMoneda(persona.ingresosMes / 100, 'EUR')}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <TrendingDown className="h-3 w-3 text-red-600" aria-hidden="true" />
                              <span className="text-red-600">{formatoMoneda(persona.gastosMes / 100, 'EUR')}</span>
                            </div>

                            {/* Pendientes / Vencidas */}
                            {persona.facturasPendientes > 0 && (
                              <Badge variant="outline" className="text-xs">
                                {persona.facturasPendientes} pend.
                              </Badge>
                            )}
                            {persona.facturasVencidas > 0 && (
                              <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 text-xs">
                                {persona.facturasVencidas} venc.
                              </Badge>
                            )}

                            {/* Última actividad */}
                            {persona.ultimaActividad && (
                              <span className="text-xs text-muted-foreground hidden xl:inline">
                                Última act.: {new Date(persona.ultimaActividad).toLocaleDateString('es-ES')}
                              </span>
                            )}

                            {/* Link */}
                            <Link href={`/dashboard?perfilActivo=${persona.perfilId}`}>
                              <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={`Ver dashboard de ${persona.nombre ?? persona.email}`}>
                                <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                              </Button>
                            </Link>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })
              )}
            </div>
          )}

          {/* Acciones masivas */}
          {filtrados.length > 0 && (
            <div className="flex gap-2 print:hidden">
              <Button variant="outline" size="sm">
                <Mail className="h-4 w-4 mr-1" aria-hidden="true" />
                Enviar recordatorio a {filtrados.length} clientes
              </Button>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-1" aria-hidden="true" />
                Exportar informe
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
