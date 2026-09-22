'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { History, Filter, ArrowRight, User } from 'lucide-react'
import { usePersonaActiva } from '@/contexts/persona-activa-context'
import { useLanguage } from '@/contexts/language-context'

interface EntradaHistorial {
  id: string
  perfilId: string
  accion: string
  entidad: string
  entidadId: string | null
  detalle: string | null
  meta: string | null
  createdAt: string
  usuarioNombre?: string
  usuarioEmail?: string
}

const ENTIDAD_LABELS: Record<string, string> = {
  factura: 'Factura',
  nomina: 'Nómina',
  propiedad: 'Propiedad',
  documento: 'Documento',
  ajuste: 'Ajuste',
  suscripcion: 'Suscripción',
  proforma: 'Proforma',
  empresa: 'Empresa',
  conciliacion: 'Conciliación',
}

const ACCION_LABELS: Record<string, string> = {
  crear: 'Creó',
  editar: 'Editó',
  eliminar: 'Eliminó',
  cambio_estado: 'Cambio de estado',
  ver: 'Consultó',
  exportar: 'Exportó',
}

const ACCION_COLORS: Record<string, string> = {
  crear: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  editar: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  eliminar: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  cambio_estado: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  ver: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
  exportar: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
}

export default function HistorialActividadPage() {
  const { t } = useLanguage()
  const { perfilActivoId, esPropio } = usePersonaActiva()
  const [entradas, setEntradas] = useState<EntradaHistorial[]>([])
  const [cargando, setCargando] = useState(true)
  const [filtroEntidad, setFiltroEntidad] = useState('')
  const [filtroAccion, setFiltroAccion] = useState('')
  const [fechaDesde, setFechaDesde] = useState('')
  const [fechaHasta, setFechaHasta] = useState('')

  const cargar = useCallback(async () => {
    setCargando(true)
    try {
      const params = new URLSearchParams()
      if (perfilActivoId) params.set('perfilId', perfilActivoId)
      if (filtroEntidad) params.set('entidad', filtroEntidad)
      if (filtroAccion) params.set('accion', filtroAccion)
      if (fechaDesde) params.set('desde', fechaDesde)
      if (fechaHasta) params.set('hasta', fechaHasta)

      const res = await fetch(`/api/fiscal/historial-actividad?${params.toString()}`)
      if (res.ok) {
        const data = await res.json()
        setEntradas(data.entradas ?? [])
      }
    } catch {
      // silent
    } finally {
      setCargando(false)
    }
  }, [perfilActivoId, filtroEntidad, filtroAccion, fechaDesde, fechaHasta])

  useEffect(() => { void cargar() }, [cargar])

  const tiposEntidad = [...new Set(entradas.map(e => e.entidad))]
  const tiposAccion = [...new Set(entradas.map(e => e.accion))]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t('historialActividad.titulo')}</h1>
        <p className="text-sm text-muted-foreground">
          {esPropio ? t('historialActividad.subtituloPropio') : t('historialActividad.subtituloGestor')}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Filter className="h-4 w-4" aria-hidden="true" />
            {t('historialActividad.filtros')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1.5">
              <Label htmlFor="filtro-entidad">{t('historialActividad.entidad')}</Label>
              <select
                id="filtro-entidad"
                value={filtroEntidad}
                onChange={e => setFiltroEntidad(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
              >
                <option value="">{t('historialActividad.todas')}</option>
                {tiposEntidad.map(t => (
                  <option key={t} value={t}>{ENTIDAD_LABELS[t] ?? t}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="filtro-accion">{t('historialActividad.accion')}</Label>
              <select
                id="filtro-accion"
                value={filtroAccion}
                onChange={e => setFiltroAccion(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
              >
                <option value="">{t('historialActividad.todas')}</option>
                {tiposAccion.map(a => (
                  <option key={a} value={a}>{ACCION_LABELS[a] ?? a}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fecha-desde">{t('historialActividad.desde')}</Label>
              <Input
                id="fecha-desde"
                type="date"
                value={fechaDesde}
                onChange={e => setFechaDesde(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fecha-hasta">{t('historialActividad.hasta')}</Label>
              <Input
                id="fecha-hasta"
                type="date"
                value={fechaHasta}
                onChange={e => setFechaHasta(e.target.value)}
              />
            </div>
          </div>
          <div className="mt-3 flex justify-end">
            <Button variant="outline" size="sm" onClick={() => { setFiltroEntidad(''); setFiltroAccion(''); setFechaDesde(''); setFechaHasta('') }}>
              {t('historialActividad.limpiarFiltros')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {cargando ? (
        <p className="text-sm text-muted-foreground">{t('historialActividad.cargando')}</p>
      ) : entradas.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>{t('historialActividad.sinRegistros')}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {entradas.map(entrada => {
            let metaParsed: Record<string, unknown> | null = null
            try { metaParsed = entrada.meta ? JSON.parse(entrada.meta) : null } catch { /* ignore */ }

            return (
              <Card key={entrada.id}>
                <CardContent className="flex items-start gap-3 p-4">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                    <User className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-sm">
                        {entrada.usuarioNombre || entrada.usuarioEmail || t('historialActividad.usuarioDesconocido')}
                      </span>
                      <Badge className={`text-xs ${ACCION_COLORS[entrada.accion] ?? ''}`}>
                        {ACCION_LABELS[entrada.accion] ?? entrada.accion}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {ENTIDAD_LABELS[entrada.entidad] ?? entrada.entidad}
                      </span>
                      {entrada.entidadId && (
                        <>
                          <ArrowRight className="h-3 w-3 text-muted-foreground" aria-hidden="true" />
                          <span className="text-xs font-mono text-muted-foreground truncate max-w-[120px]">
                            {entrada.entidadId.slice(0, 8)}...
                          </span>
                        </>
                      )}
                    </div>
                    {entrada.detalle && (
                      <p className="mt-1 text-sm text-muted-foreground">{entrada.detalle}</p>
                    )}
                    {metaParsed && (
                      <div className="mt-2 rounded-md bg-muted p-2 text-xs font-mono">
                        <pre className="whitespace-pre-wrap">{JSON.stringify(metaParsed, null, 2)}</pre>
                      </div>
                    )}
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(entrada.createdAt).toLocaleDateString('es-ES', {
                      day: '2-digit', month: 'short', year: 'numeric',
                      hour: '2-digit', minute: '2-digit',
                    })}
                  </span>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
