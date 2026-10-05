'use client'

import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Plus, Trash2, Pencil, CheckCircle, Clock, AlertTriangle, Calendar, List, ListChecks } from 'lucide-react'
import { useLanguage } from '@/contexts/language-context'
import {
  listarRecordatorios,
  crearRecordatorio,
  actualizarRecordatorio,
  eliminarRecordatorio,
  marcarCompletado,
  obtenerRecordatoriosPendientes,
  obtenerRecordatoriosVencidos,
  obtenerRecordatoriosEstaSemana,
  obtenerRecordatoriosPorFecha,
  getTipoLabel,
  getRepetirLabel,
  type Recordatorio,
  type TipoRecordatorio,
  type Repetir,
} from '@/lib/recordatorios-custom'

const TIPOS: TipoRecordatorio[] = ['factura_vencimiento', 'modelo_fiscal', 'pago_recibido', 'personalizado']
const REPETIR_OPCIONES: Repetir[] = ['no', 'diario', 'semanal', 'mensual', 'anual']

const TIPO_COLORS: Record<TipoRecordatorio, string> = {
  factura_vencimiento: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  modelo_fiscal: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  pago_recibido: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  personalizado: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
}

const DIAS_SEMANA = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa', 'Do']
const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

interface FormState {
  titulo: string
  descripcion: string
  fecha: string
  tipo: TipoRecordatorio
  repetir: Repetir
}

const FORM_VACIO: FormState = {
  titulo: '',
  descripcion: '',
  fecha: new Date().toISOString().slice(0, 10),
  tipo: 'personalizado',
  repetir: 'no',
}

function fmtFechaCorta(iso: string): string {
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })
}

export default function RecordatoriosPage() {
  const { t } = useLanguage()
  const [recordatorios, setRecordatorios] = useState<Recordatorio[]>([])
  const [dialogAbierto, setDialogAbierto] = useState(false)
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(FORM_VACIO)
  const [filtro, setFiltro] = useState<'todos' | 'pendientes' | 'completados'>('todos')
  const [vista, setVista] = useState<'lista' | 'calendario'>('lista')
  const [mesCalendario, setMesCalendario] = useState(() => new Date())
  const [diaSeleccionado, setDiaSeleccionado] = useState<string | null>(null)
  const [eliminandoId, setEliminandoId] = useState<string | null>(null)

  useEffect(() => {
    setRecordatorios(listarRecordatorios())
  }, [])

  // eslint-disable-next-line react-hooks/exhaustive-deps -- el helper lee localStorage; `recordatorios` es el trigger de recomputación
  const pendientes = useMemo(() => obtenerRecordatoriosPendientes(), [recordatorios])
  // eslint-disable-next-line react-hooks/exhaustive-deps -- el helper lee localStorage; `recordatorios` es el trigger de recomputación
  const vencidos = useMemo(() => obtenerRecordatoriosVencidos(), [recordatorios])
  // eslint-disable-next-line react-hooks/exhaustive-deps -- el helper lee localStorage; `recordatorios` es el trigger de recomputación
  const estaSemana = useMemo(() => obtenerRecordatoriosEstaSemana(), [recordatorios])

  const recordatoriosFiltrados = useMemo(() => {
    switch (filtro) {
      case 'pendientes': return recordatorios.filter(r => !r.completado)
      case 'completados': return recordatorios.filter(r => r.completado)
      default: return recordatorios
    }
  }, [recordatorios, filtro])

  const recordatoriosDiaSeleccionado = useMemo(() => {
    if (!diaSeleccionado) return []
    return obtenerRecordatoriosPorFecha(diaSeleccionado)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- el helper lee localStorage; `recordatorios` es el trigger
  }, [diaSeleccionado, recordatorios])

  const diasDelMes = useMemo(() => {
    const year = mesCalendario.getFullYear()
    const month = mesCalendario.getMonth()
    const primerDia = new Date(year, month, 1)
    const ultimoDia = new Date(year, month + 1, 0)
    const dias: (number | null)[] = []
    let diaSemana = primerDia.getDay()
    if (diaSemana === 0) diaSemana = 7
    for (let i = 1; i < diaSemana; i++) dias.push(null)
    for (let i = 1; i <= ultimoDia.getDate(); i++) dias.push(i)
    return dias
  }, [mesCalendario])

  const recordatoriosPorDia = useMemo(() => {
    const mapa: Record<string, Recordatorio[]> = {}
    const year = mesCalendario.getFullYear()
    const month = mesCalendario.getMonth()
    for (const rec of recordatorios) {
      const f = new Date(rec.fecha + 'T00:00:00')
      if (f.getFullYear() === year && f.getMonth() === month) {
        const key = rec.fecha
        if (!mapa[key]) mapa[key] = []
        mapa[key].push(rec)
      }
    }
    return mapa
  }, [recordatorios, mesCalendario])

  const abrirCrear = () => {
    setEditandoId(null)
    setForm(FORM_VACIO)
    setDialogAbierto(true)
  }

  const abrirEditar = (rec: Recordatorio) => {
    setEditandoId(rec.id)
    setForm({
      titulo: rec.titulo,
      descripcion: rec.descripcion,
      fecha: rec.fecha,
      tipo: rec.tipo,
      repetir: rec.repetir,
    })
    setDialogAbierto(true)
  }

  const guardar = () => {
    if (!form.titulo.trim()) return
    if (editandoId) {
      actualizarRecordatorio(editandoId, {
        titulo: form.titulo.trim(),
        descripcion: form.descripcion.trim(),
        fecha: form.fecha,
        tipo: form.tipo,
        repetir: form.repetir,
      })
    } else {
      crearRecordatorio({
        titulo: form.titulo.trim(),
        descripcion: form.descripcion.trim(),
        fecha: form.fecha,
        tipo: form.tipo,
        repetir: form.repetir,
        activo: true,
      })
    }
    setRecordatorios(listarRecordatorios())
    setDialogAbierto(false)
  }

  const handleEliminar = (id: string) => {
    eliminarRecordatorio(id)
    setRecordatorios(listarRecordatorios())
    setEliminandoId(null)
  }

  const handleCompletar = (id: string) => {
    marcarCompletado(id)
    setRecordatorios(listarRecordatorios())
  }

  const navMes = (dir: number) => {
    setMesCalendario(prev => {
      const d = new Date(prev)
      d.setMonth(d.getMonth() + dir)
      return d
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('recordatorios.titulo')}</h1>
          <p className="text-muted-foreground">{t('recordatorios.subtitulo')}</p>
        </div>
        <div className="flex gap-2">
          <div className="flex border rounded-md">
            <Button
              variant={vista === 'lista' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setVista('lista')}
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              variant={vista === 'calendario' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setVista('calendario')}
            >
              <Calendar className="h-4 w-4" />
            </Button>
          </div>
          <Button onClick={abrirCrear}>
            <Plus className="mr-2 h-4 w-4" /> {t('recordatorios.nuevo')}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t('recordatorios.pendientesHoy')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              <span className="text-2xl font-bold">{pendientes.length}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t('recordatorios.pendientesSemana')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-600" />
              <span className="text-2xl font-bold">{estaSemana.length}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t('recordatorios.vencidos')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <span className="text-2xl font-bold">{vencidos.length}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {vista === 'lista' ? (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <ListChecks className="h-4 w-4" /> {t('recordatorios.listaRecordatorios')}
              </CardTitle>
              <div className="flex gap-1">
                {(['todos', 'pendientes', 'completados'] as const).map(f => (
                  <Button
                    key={f}
                    variant={filtro === f ? 'secondary' : 'ghost'}
                    size="sm"
                    onClick={() => setFiltro(f)}
                  >
                    {t(`recordatorios.filtro_${f}`)}
                  </Button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {recordatoriosFiltrados.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">{t('recordatorios.sinRecordatorios')}</p>
            ) : (
              <div className="space-y-2">
                {recordatoriosFiltrados.map(rec => (
                  <div
                    key={rec.id}
                    className={`flex items-center justify-between rounded-lg border p-3 text-sm transition-opacity ${rec.completado ? 'opacity-50' : ''}`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Button
                        variant={rec.completado ? 'secondary' : 'outline'}
                        size="icon"
                        className="h-8 w-8 shrink-0"
                        onClick={() => handleCompletar(rec.id)}
                        disabled={rec.completado}
                      >
                        <CheckCircle className={`h-4 w-4 ${rec.completado ? 'text-green-600' : ''}`} />
                      </Button>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`font-medium truncate ${rec.completado ? 'line-through' : ''}`}>
                            {rec.titulo}
                          </span>
                          <Badge variant="secondary" className={`text-xs shrink-0 ${TIPO_COLORS[rec.tipo]}`}>
                            {getTipoLabel(rec.tipo)}
                          </Badge>
                          {rec.repetir !== 'no' && (
                            <Badge variant="outline" className="text-xs shrink-0">
                              {getRepetirLabel(rec.repetir)}
                            </Badge>
                          )}
                        </div>
                        {rec.descripcion && (
                          <p className="text-xs text-muted-foreground truncate">{rec.descripcion}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {fmtFechaCorta(rec.fecha)}
                      </span>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => abrirEditar(rec)}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                      {eliminandoId === rec.id ? (
                        <div className="flex items-center gap-1">
                          <Button variant="destructive" size="sm" onClick={() => handleEliminar(rec.id)}>
                            {t('common.confirmar')}
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => setEliminandoId(null)}>
                            {t('common.cancelar')}
                          </Button>
                        </div>
                      ) : (
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setEliminandoId(rec.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="h-4 w-4" /> {t('recordatorios.calendario')}
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => navMes(-1)}>
                  &laquo;
                </Button>
                <span className="text-sm font-medium min-w-[140px] text-center">
                  {MESES[mesCalendario.getMonth()]} {mesCalendario.getFullYear()}
                </span>
                <Button variant="outline" size="sm" onClick={() => navMes(1)}>
                  &raquo;
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-1">
              {DIAS_SEMANA.map(d => (
                <div key={d} className="text-center text-xs font-medium text-muted-foreground py-1">
                  {d}
                </div>
              ))}
              {diasDelMes.map((dia, i) => {
                if (dia === null) return <div key={`empty-${i}`} />
                const fechaStr = `${mesCalendario.getFullYear()}-${String(mesCalendario.getMonth() + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`
                const recsDelDia = recordatoriosPorDia[fechaStr] ?? []
                const esHoy = fechaStr === new Date().toISOString().split('T')[0]
                const seleccionado = fechaStr === diaSeleccionado
                return (
                  <button
                    key={i}
                    onClick={() => setDiaSeleccionado(diaSeleccionado === fechaStr ? null : fechaStr)}
                    className={`relative rounded-lg border p-1 text-sm min-h-[48px] text-left transition-colors ${
                      seleccionado ? 'border-primary bg-primary/10' :
                      esHoy ? 'border-primary/50 bg-primary/5' :
                      'hover:bg-muted'
                    }`}
                  >
                    <span className={`text-xs ${esHoy ? 'font-bold text-primary' : ''}`}>{dia}</span>
                    {recsDelDia.length > 0 && (
                      <div className="flex gap-0.5 mt-0.5 flex-wrap">
                        {recsDelDia.slice(0, 3).map(r => (
                          <div
                            key={r.id}
                            className={`h-1.5 w-1.5 rounded-full ${r.completado ? 'bg-muted-foreground/30' : 'bg-primary'}`}
                          />
                        ))}
                        {recsDelDia.length > 3 && (
                          <span className="text-[8px] text-muted-foreground">+{recsDelDia.length - 3}</span>
                        )}
                      </div>
                    )}
                  </button>
                )
              })}
            </div>

            {diaSeleccionado && (
              <div className="mt-4 border-t pt-4">
                <p className="text-sm font-medium mb-2">
                  {fmtFechaCorta(diaSeleccionado)} — {recordatoriosDiaSeleccionado.length} recordatorio(s)
                </p>
                {recordatoriosDiaSeleccionado.length === 0 ? (
                  <p className="text-xs text-muted-foreground">{t('recordatorios.sinRecordatoriosDia')}</p>
                ) : (
                  <div className="space-y-2">
                    {recordatoriosDiaSeleccionado.map(rec => (
                      <div
                        key={rec.id}
                        className={`flex items-center justify-between rounded-lg border p-2 text-sm ${rec.completado ? 'opacity-50' : ''}`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <CheckCircle
                            className={`h-4 w-4 shrink-0 cursor-pointer ${rec.completado ? 'text-green-600' : 'text-muted-foreground'}`}
                            onClick={() => handleCompletar(rec.id)}
                          />
                          <div className="min-w-0">
                            <span className={`font-medium ${rec.completado ? 'line-through' : ''}`}>
                              {rec.titulo}
                            </span>
                            <Badge variant="secondary" className={`text-xs ml-2 ${TIPO_COLORS[rec.tipo]}`}>
                              {getTipoLabel(rec.tipo)}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => abrirEditar(rec)}>
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleEliminar(rec.id)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Dialog open={dialogAbierto} onOpenChange={setDialogAbierto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editandoId ? t('recordatorios.editar') : t('recordatorios.nuevo')}</DialogTitle>
            <DialogDescription>{t('recordatorios.descripcionDialogo')}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="titulo">{t('recordatorios.tituloCampo')}</Label>
              <Input
                id="titulo"
                value={form.titulo}
                onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))}
                placeholder={t('recordatorios.tituloPlaceholder')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="descripcion">{t('common.descripcion')}</Label>
              <Textarea
                id="descripcion"
                value={form.descripcion}
                onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
                placeholder={t('recordatorios.descripcionPlaceholder')}
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fecha">{t('common.fecha')}</Label>
                <Input
                  id="fecha"
                  type="date"
                  value={form.fecha}
                  onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label>{t('recordatorios.tipo')}</Label>
                <select
                  value={form.tipo}
                  onChange={e => setForm(f => ({ ...f, tipo: e.target.value as TipoRecordatorio }))}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {TIPOS.map(tipo => (
                    <option key={tipo} value={tipo}>{getTipoLabel(tipo)}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>{t('recordatorios.repetir')}</Label>
              <select
                value={form.repetir}
                onChange={e => setForm(f => ({ ...f, repetir: e.target.value as Repetir }))}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {REPETIR_OPCIONES.map(r => (
                  <option key={r} value={r}>{getRepetirLabel(r)}</option>
                ))}
              </select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogAbierto(false)}>
              {t('common.cancelar')}
            </Button>
            <Button onClick={guardar} disabled={!form.titulo.trim()}>
              {t('common.guardar')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
