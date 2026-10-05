'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Plus, Trash2, Pencil, Play, Zap, Clock, CheckCircle, Bell, Mail, Flag, RefreshCw } from 'lucide-react'
import { useLanguage } from '@/contexts/language-context'
import { listarReglas, crearRegla, actualizarRegla, eliminarRegla, toggleActiva, registrarEjecucion, listarHistorial, getCondicionLabel, getAccionLabel, type Regla, type TipoCondicion, type TipoAccion, type EjecucionHistorial, type FacturaInput } from '@/lib/automatizaciones'

const TIPOS_CONDICION: TipoCondicion[] = [
  'importe_mayor_que',
  'importe_menor_que',
  'categoria_es',
  'cliente_es',
  'fecha_vencimiento_hoy',
]

const TIPOS_ACCION: TipoAccion[] = [
  'crear_notificacion',
  'marcar_prioritaria',
  'enviar_email',
  'cambiar_estado',
]

const ESTADOS_FACTURA = ['pendiente', 'pagada', 'vencida']

const CATEGORIAS_FACTURA = [
  'material_limpieza',
  'material_oficina',
  'transporte',
  'suministros',
  'servicios_profesionales',
  'alquiler_local',
  'nomina_empleada',
  'cuota_autonomo',
  'otros',
]

interface FormCondicion {
  tipo: TipoCondicion
  valor: string
}

interface FormAccion {
  tipo: TipoAccion
  parametros: Record<string, string>
}

interface FormState {
  nombre: string
  condicion: FormCondicion
  accion: FormAccion
}

const FORM_VACIO: FormState = {
  nombre: '',
  condicion: { tipo: 'importe_mayor_que', valor: '' },
  accion: { tipo: 'crear_notificacion', parametros: { mensaje: '' } },
}

const ACCION_ICONS: Record<TipoAccion, typeof Bell> = {
  crear_notificacion: Bell,
  marcar_prioritaria: Flag,
  enviar_email: Mail,
  cambiar_estado: RefreshCw,
}

const fmtFecha = (iso: string) => {
  const d = new Date(iso)
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

export default function AutomatizacionesPage() {
  const { t } = useLanguage()
  const [reglas, setReglas] = useState<Regla[]>([])
  const [historial, setHistorial] = useState<EjecucionHistorial[]>([])
  const [dialogAbierto, setDialogAbierto] = useState(false)
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(FORM_VACIO)
  const [eliminandoId, setEliminandoId] = useState<string | null>(null)
  const [ejecutando, setEjecutando] = useState(false)
  const [resultadoEjecucion, setResultadoEjecucion] = useState<{ reglas: number; facturas: number } | null>(null)

  useEffect(() => {
    setReglas(listarReglas())
    setHistorial(listarHistorial())
  }, [])

  const abrirCrear = () => {
    setEditandoId(null)
    setForm(FORM_VACIO)
    setDialogAbierto(true)
  }

  const abrirEditar = (regla: Regla) => {
    setEditandoId(regla.id)
    setForm({
      nombre: regla.nombre,
      condicion: { ...regla.condicion },
      accion: { tipo: regla.accion.tipo, parametros: { ...regla.accion.parametros } },
    })
    setDialogAbierto(true)
  }

  const guardar = () => {
    if (!form.nombre.trim()) return

    const datosRegla = {
      nombre: form.nombre.trim(),
      condicion: form.condicion,
      accion: form.accion,
      activa: true,
    }

    if (editandoId) {
      actualizarRegla(editandoId, datosRegla)
    } else {
      crearRegla(datosRegla)
    }

    setReglas(listarReglas())
    setDialogAbierto(false)
  }

  const handleEliminar = (id: string) => {
    eliminarRegla(id)
    setReglas(listarReglas())
    setEliminandoId(null)
  }

  const handleToggle = (id: string) => {
    toggleActiva(id)
    setReglas(listarReglas())
  }

  const ejecutarReglas = () => {
    setEjecutando(true)
    setResultadoEjecucion(null)

    setTimeout(() => {
      const reglasActivas = reglas.filter(r => r.activa)
      let totalFacturas = 0

      const facturasDemo: FacturaInput[] = [
        {
          id: 'demo-1',
          tipo: 'gasto',
          importeTotal: 1500,
          categoria: 'material_limpieza',
          proveedorNombre: 'Suministros García',
          concepto: 'Productos de limpieza mensuales',
          fecha: new Date(),
        },
        {
          id: 'demo-2',
          tipo: 'ingreso',
          importeTotal: 800,
          categoria: 'servicio_limpieza',
          proveedorNombre: 'Cliente Local 1',
          concepto: 'Servicio de limpieza oficina',
          fecha: new Date(),
        },
        {
          id: 'demo-3',
          tipo: 'gasto',
          importeTotal: 200,
          categoria: 'transporte',
          proveedorNombre: 'Taxi Express',
          concepto: 'Desplazamiento cliente',
          fecha: new Date(),
        },
      ]

      for (const regla of reglasActivas) {
        const facturasQueCumplen = facturasDemo.filter(f => {
          switch (regla.condicion.tipo) {
            case 'importe_mayor_que':
              return f.importeTotal > parseFloat(regla.condicion.valor)
            case 'importe_menor_que':
              return f.importeTotal < parseFloat(regla.condicion.valor)
            case 'categoria_es':
              return f.categoria === regla.condicion.valor
            case 'cliente_es':
              return f.proveedorNombre?.toLowerCase().includes(regla.condicion.valor.toLowerCase()) ?? false
            case 'fecha_vencimiento_hoy':
              return true
            default:
              return false
          }
        })

        for (const factura of facturasQueCumplen) {
          registrarEjecucion(regla.id, regla.nombre, factura, regla.accion)
          totalFacturas++
        }
      }

      setReglas(listarReglas())
      setHistorial(listarHistorial())
      setResultadoEjecucion({ reglas: reglasActivas.length, facturas: totalFacturas })
      setEjecutando(false)
    }, 800)
  }

  const necesitaValor = (tipo: TipoCondicion) =>
    tipo !== 'fecha_vencimiento_hoy'

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('automatizaciones.titulo')}</h1>
          <p className="text-muted-foreground">{t('automatizaciones.subtitulo')}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={ejecutarReglas} disabled={ejecutando || reglas.filter(r => r.activa).length === 0}>
            {ejecutando ? (
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Play className="mr-2 h-4 w-4" />
            )}
            {t('automatizaciones.ejecutarAhora')}
          </Button>
          <Button onClick={abrirCrear}>
            <Plus className="mr-2 h-4 w-4" /> {t('automatizaciones.nuevaRegla')}
          </Button>
        </div>
      </div>

      {resultadoEjecucion && (
        <Card className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
          <CardContent className="py-3">
            <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-300">
              <CheckCircle className="h-4 w-4" />
              {`${resultadoEjecucion.reglas} reglas evaluadas, ${resultadoEjecucion.facturas} facturas afectadas`}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t('automatizaciones.totalReglas')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              <span className="text-2xl font-bold">{reglas.length}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {reglas.filter(r => r.activa).length} {t('automatizaciones.activas')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t('automatizaciones.totalEjecuciones')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Play className="h-5 w-5 text-blue-600" />
              <span className="text-2xl font-bold">
                {reglas.reduce((s, r) => s + r.ejecuciones, 0)}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {t('automatizaciones.vecesEjecutadas')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t('automatizaciones.ultimaEjecucion')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-orange-500" />
              <span className="text-sm font-bold">
                {historial.length > 0 && historial[0] ? fmtFecha(historial[0].fecha) : '—'}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {historial.length > 0 && historial[0] ? historial[0].reglaNombre : t('automatizaciones.sinEjecuciones')}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Zap className="h-4 w-4" /> {t('automatizaciones.reglasDeAutomatizacion')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {reglas.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">{t('automatizaciones.sinReglas')}</p>
            ) : (
              <div className="space-y-2">
                {reglas.map(regla => {
                  const Icon = ACCION_ICONS[regla.accion.tipo]
                  return (
                    <div
                      key={regla.id}
                      className={`flex items-center justify-between rounded-lg border p-3 text-sm transition-opacity ${!regla.activa ? 'opacity-50' : ''}`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Switch
                          checked={regla.activa}
                          onCheckedChange={() => handleToggle(regla.id)}
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium truncate">{regla.nombre}</span>
                            <Badge variant="secondary" className="text-xs shrink-0">
                              {regla.ejecuciones} exec
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground truncate">
                            {getCondicionLabel(regla.condicion.tipo)}
                            {regla.condicion.valor ? `: ${regla.condicion.valor}` : ''} → {getAccionLabel(regla.accion.tipo)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Icon className="h-3.5 w-3.5 text-muted-foreground mr-1" />
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => abrirEditar(regla)}>
                          <Pencil className="h-3 w-3" />
                        </Button>
                        {eliminandoId === regla.id ? (
                          <div className="flex items-center gap-1">
                            <Button variant="destructive" size="sm" onClick={() => handleEliminar(regla.id)}>
                              {t('common.confirmar')}
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => setEliminandoId(null)}>
                              {t('common.cancelar')}
                            </Button>
                          </div>
                        ) : (
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setEliminandoId(regla.id)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-4 w-4" /> {t('automatizaciones.historial')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {historial.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">{t('automatizaciones.sinHistorial')}</p>
            ) : (
              <div className="space-y-2">
                {historial.map(ejecucion => (
                  <div key={ejecucion.id} className="rounded-lg border p-2 text-xs">
                    <div className="flex items-center gap-1.5 mb-1">
                      <CheckCircle className="h-3 w-3 text-green-600 shrink-0" />
                      <span className="font-medium truncate">{ejecucion.reglaNombre}</span>
                    </div>
                    <p className="text-muted-foreground truncate">{ejecucion.facturaConcepto}</p>
                    <p className="text-muted-foreground mt-0.5">{ejecucion.accionEjecutada}</p>
                    <p className="text-muted-foreground mt-0.5">{fmtFecha(ejecucion.fecha)}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={dialogAbierto} onOpenChange={setDialogAbierto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editandoId ? t('automatizaciones.editarRegla') : t('automatizaciones.nuevaRegla')}</DialogTitle>
            <DialogDescription>
              {t('automatizaciones configurarRegla')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nombre">{t('common.nombre')}</Label>
              <Input
                id="nombre"
                value={form.nombre}
                onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
                placeholder={t('automatizaciones.nombrePlaceholder')}
              />
            </div>

            <div className="space-y-2">
              <Label>{t('automatizaciones.condicion')}</Label>
              <div className="flex gap-2">
                <select
                  value={form.condicion.tipo}
                  onChange={e =>
                    setForm(f => ({
                      ...f,
                      condicion: { ...f.condicion, tipo: e.target.value as TipoCondicion },
                    }))
                  }
                  className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {TIPOS_CONDICION.map(tc => (
                    <option key={tc} value={tc}>{getCondicionLabel(tc)}</option>
                  ))}
                </select>
                {necesitaValor(form.condicion.tipo) && (
                  <Input
                    value={form.condicion.valor}
                    onChange={e =>
                      setForm(f => ({
                        ...f,
                        condicion: { ...f.condicion, valor: e.target.value },
                      }))
                    }
                    placeholder={form.condicion.tipo === 'categoria_es' ? 'material_limpieza' : form.condicion.tipo === 'cliente_es' ? 'Nombre cliente' : '1000'}
                    className="flex-1"
                  />
                )}
              </div>
              {form.condicion.tipo === 'categoria_es' && (
                <select
                  value={form.condicion.valor}
                  onChange={e =>
                    setForm(f => ({
                      ...f,
                      condicion: { ...f.condicion, valor: e.target.value },
                    }))
                  }
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="">Seleccionar categoría...</option>
                  {CATEGORIAS_FACTURA.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              )}
            </div>

            <div className="space-y-2">
              <Label>{t('automatizaciones.accion')}</Label>
              <div className="flex gap-2">
                <select
                  value={form.accion.tipo}
                  onChange={e => {
                    const tipo = e.target.value as TipoAccion
                    setForm(f => ({
                      ...f,
                      accion: { tipo, parametros: {} },
                    }))
                  }}
                  className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {TIPOS_ACCION.map(ta => (
                    <option key={ta} value={ta}>{getAccionLabel(ta)}</option>
                  ))}
                </select>
              </div>

              {form.accion.tipo === 'crear_notificacion' && (
                <Input
                  value={form.accion.parametros.mensaje ?? ''}
                  onChange={e =>
                    setForm(f => ({
                      ...f,
                      accion: { ...f.accion, parametros: { ...f.accion.parametros, mensaje: e.target.value } },
                    }))
                  }
                  placeholder="Mensaje de la notificación"
                  className="mt-2"
                />
              )}

              {form.accion.tipo === 'cambiar_estado' && (
                <select
                  value={form.accion.parametros.estado ?? ''}
                  onChange={e =>
                    setForm(f => ({
                      ...f,
                      accion: { ...f.accion, parametros: { ...f.accion.parametros, estado: e.target.value } },
                    }))
                  }
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring mt-2"
                >
                  <option value="">Seleccionar estado...</option>
                  {ESTADOS_FACTURA.map(ef => (
                    <option key={ef} value={ef}>{ef}</option>
                  ))}
                </select>
              )}

              {form.accion.tipo === 'enviar_email' && (
                <Input
                  value={form.accion.parametros.email ?? ''}
                  onChange={e =>
                    setForm(f => ({
                      ...f,
                      accion: { ...f.accion, parametros: { ...f.accion.parametros, email: e.target.value } },
                    }))
                  }
                  placeholder="email@ejemplo.com"
                  className="mt-2"
                />
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogAbierto(false)}>
              {t('common.cancelar')}
            </Button>
            <Button
              onClick={guardar}
              disabled={!form.nombre.trim()}
            >
              {t('common.guardar')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
