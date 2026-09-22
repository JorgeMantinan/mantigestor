'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { usePersonaActiva } from '@/contexts/persona-activa-context'
import {
  AlertTriangle, AlertCircle, Info, RefreshCw, Mail, CheckCircle,
  Filter, ChevronDown, ChevronRight, Users,
} from 'lucide-react'
import {
  generarAlertasGestor,
  filtrarAlertas,
  agruparPorCliente,
  contarPorPrioridad,
  type AlertaGestor,
  type PrioridadAlerta,
} from '@/lib/alertas-gestor'

const ICONO_PRIORIDAD: Record<PrioridadAlerta, React.ReactNode> = {
  alta: <AlertCircle className="h-4 w-4 text-red-600" />,
  media: <AlertTriangle className="h-4 w-4 text-yellow-600" />,
  baja: <Info className="h-4 w-4 text-blue-600" />,
}

const COLOR_PRIORIDAD: Record<PrioridadAlerta, string> = {
  alta: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  media: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  baja: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
}

export default function AlertasGestorPage() {
  const { personas } = usePersonaActiva()
  const [alertas, setAlertas] = useState<AlertaGestor[]>([])
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState<'todas' | 'alta' | 'media' | 'baja'>('todas')
  const [clientesExpandidos, setClientesExpandidos] = useState<Set<string>>(new Set())
  const [resueltas, setResueltas] = useState<Set<string>>(new Set())

  const clientesGestionados = personas.filter(p => p.tipo === 'gestiono')

  const cargarAlertas = useCallback(async () => {
    setLoading(true)
    try {
      const nuevas = await generarAlertasGestor()
      setAlertas(nuevas)
    } catch {
      // Silenciar errores
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (clientesGestionados.length > 0) {
      void cargarAlertas()
    } else {
      setLoading(false)
    }
  }, [clientesGestionados.length, cargarAlertas])

  // Auto-refresh cada 5 minutos
  useEffect(() => {
    const interval = setInterval(() => {
      if (clientesGestionados.length > 0) {
        void cargarAlertas()
      }
    }, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [clientesGestionados.length, cargarAlertas])

  const toggleCliente = (perfilId: string) => {
    setClientesExpandidos(prev => {
      const next = new Set(prev)
      if (next.has(perfilId)) {
        next.delete(perfilId)
      } else {
        next.add(perfilId)
      }
      return next
    })
  }

  const marcarResuelta = (alertaId: string) => {
    setResueltas(prev => {
      const next = new Set(prev)
      next.add(alertaId)
      return next
    })
  }

  const alertasFiltradas = filtrarAlertas(
    alertas.filter(a => !resueltas.has(a.id)),
    filtro
  )
  const agrupadas = agruparPorCliente(alertasFiltradas)
  const conteo = contarPorPrioridad(alertas.filter(a => !resueltas.has(a.id)))

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-heading font-bold tracking-tight">Alertas de Asesoría</h1>
          <p className="text-muted-foreground">Alertas automáticas para todos tus clientes</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void cargarAlertas()} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
          Actualizar
        </Button>
      </div>

      {clientesGestionados.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-12">
            <Users className="h-12 w-12 text-muted-foreground" />
            <div className="text-center">
              <p className="font-medium">No gestionas ningún cliente</p>
              <p className="text-sm text-muted-foreground">
                Asocia personas desde Ajustes &gt; Personas para ver alertas.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* KPIs de alertas */}
          <div className="grid grid-cols-3 gap-4">
            <Card className="border-red-500/50">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  Prioridad alta
                </div>
                <p className="mt-1 text-2xl font-bold text-red-600">{conteo.alta}</p>
              </CardContent>
            </Card>
            <Card className="border-yellow-500/50">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                  Prioridad media
                </div>
                <p className="mt-1 text-2xl font-bold text-yellow-600">{conteo.media}</p>
              </CardContent>
            </Card>
            <Card className="border-blue-500/50">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Info className="h-4 w-4 text-blue-600" />
                  Prioridad baja
                </div>
                <p className="mt-1 text-2xl font-bold text-blue-600">{conteo.baja}</p>
              </CardContent>
            </Card>
          </div>

          {/* Filtros */}
          <div className="flex gap-2">
            <Button
              variant={filtro === 'todas' ? 'secondary' : 'outline'}
              size="sm"
              onClick={() => setFiltro('todas')}
            >
              Todas ({conteo.alta + conteo.media + conteo.baja})
            </Button>
            <Button
              variant={filtro === 'alta' ? 'secondary' : 'outline'}
              size="sm"
              onClick={() => setFiltro('alta')}
            >
              <Filter className="h-3 w-3 mr-1" aria-hidden="true" />
              Alta ({conteo.alta})
            </Button>
            <Button
              variant={filtro === 'media' ? 'secondary' : 'outline'}
              size="sm"
              onClick={() => setFiltro('media')}
            >
              <Filter className="h-3 w-3 mr-1" aria-hidden="true" />
              Media ({conteo.media})
            </Button>
            <Button
              variant={filtro === 'baja' ? 'secondary' : 'outline'}
              size="sm"
              onClick={() => setFiltro('baja')}
            >
              <Filter className="h-3 w-3 mr-1" aria-hidden="true" />
              Baja ({conteo.baja})
            </Button>
          </div>

          {loading ? (
            <p className="text-muted-foreground">Analizando clientes...</p>
          ) : alertasFiltradas.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                {alertas.length === 0
                  ? 'No hay alertas. Todos tus clientes están al día.'
                  : 'No hay alertas con el filtro seleccionado.'}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {Array.from(agrupadas.entries()).map(([perfilId, alertasCliente]) => {
                const expandido = clientesExpandidos.has(perfilId)
                const nombreCliente = alertasCliente[0]?.nombreCliente ?? 'Desconocido'
                const tieneAlta = alertasCliente.some(a => a.prioridad === 'alta')

                return (
                  <Card key={perfilId} className={tieneAlta ? 'border-red-500/50' : ''}>
                    <CardHeader
                      className="cursor-pointer select-none py-3"
                      onClick={() => toggleCliente(perfilId)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {expandido ? (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          )}
                          <CardTitle className="text-base">{nombreCliente}</CardTitle>
                          <Badge variant="outline" className="text-xs">
                            {alertasCliente.length} alerta{alertasCliente.length !== 1 ? 's' : ''}
                          </Badge>
                        </div>
                        <div className="flex gap-1">
                          {alertasCliente.some(a => a.prioridad === 'alta') && (
                            <Badge className={`text-xs ${COLOR_PRIORIDAD.alta}`}>Alta</Badge>
                          )}
                          {alertasCliente.some(a => a.prioridad === 'media') && (
                            <Badge className={`text-xs ${COLOR_PRIORIDAD.media}`}>Media</Badge>
                          )}
                          {alertasCliente.some(a => a.prioridad === 'baja') && (
                            <Badge className={`text-xs ${COLOR_PRIORIDAD.baja}`}>Baja</Badge>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    {expandido && (
                      <CardContent className="space-y-2 pt-0">
                        {alertasCliente.map(alerta => (
                          <div
                            key={alerta.id}
                            className="flex items-center justify-between gap-3 rounded-lg border p-3 text-sm"
                          >
                            <div className="flex items-start gap-3 min-w-0">
                              {ICONO_PRIORIDAD[alerta.prioridad]}
                              <div className="min-w-0">
                                <p className="font-medium">{alerta.titulo}</p>
                                <p className="text-xs text-muted-foreground">{alerta.descripcion}</p>
                                {alerta.modeloRelacionado && (
                                  <Badge variant="outline" className="mt-1 text-xs">
                                    Modelo {alerta.modeloRelacionado}
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <div className="flex gap-1 shrink-0">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                aria-label="Enviar recordatorio por email"
                              >
                                <Mail className="h-4 w-4" aria-hidden="true" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                aria-label="Marcar como resuelta"
                                onClick={() => marcarResuelta(alerta.id)}
                              >
                                <CheckCircle className="h-4 w-4" aria-hidden="true" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </CardContent>
                    )}
                  </Card>
                )
              })}
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            Las alertas se actualizan automáticamente cada 5 minutos.
            Última actualización: {new Date().toLocaleTimeString('es-ES')}
          </p>
        </>
      )}
    </div>
  )
}
