'use client'

import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Plus,
  Trash2,
  CheckCircle,
  CircleDollarSign,
  CalendarDays,
  Pencil,
  Repeat,
} from 'lucide-react'
import {
  listarPagos,
  crearPago,
  actualizarPago,
  eliminarPago,
  toggleActivo,
  marcarComoPagado,
  obtenerPagosPendientes,
  obtenerPagosDelMes,
  estaPagadoEsteMes,
  calcularTotalMensual,
  obtenerDiasConPagos,
  CATEGORIAS_PAGO,
  type PagoRecurrente,
} from '@/lib/pagos-recurrentes'
import { useLanguage } from '@/contexts/language-context'

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

const DIAS_SEMANA = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

const fmtEuro = (n: number) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n)

interface FormState {
  concepto: string
  importe: string
  dia_pago: string
  categoria: string
  notas: string
}

const FORM_VACIO: FormState = { concepto: '', importe: '', dia_pago: '1', categoria: 'Otros', notas: '' }

export default function PagosRecurrentesPage() {
  const { t } = useLanguage()
  const [pagos, setPagos] = useState<PagoRecurrente[]>([])
  const [dialogAbierto, setDialogAbierto] = useState(false)
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(FORM_VACIO)
  const [eliminandoId, setEliminandoId] = useState<string | null>(null)
  const [mesCalendario, setMesCalendario] = useState(() => new Date().getMonth())
  const [anyoCalendario, setAnyoCalendario] = useState(() => new Date().getFullYear())

  const hoy = useMemo(() => new Date(), [])

  useEffect(() => {
    setPagos(listarPagos())
  }, [])

  const pagosActivos = useMemo(() => pagos.filter(p => p.activo), [pagos])
  // eslint-disable-next-line react-hooks/exhaustive-deps -- calcularTotalMensual viene de lib/pagos-recurrentes (lee localStorage); pagos es el trigger
  const totalMensual = useMemo(() => calcularTotalMensual(), [pagos])
  // eslint-disable-next-line react-hooks/exhaustive-deps -- el helper cierra sobre `pagos`
  const pendientes = useMemo(() => obtenerPagosPendientes(hoy), [pagos, hoy])
  // eslint-disable-next-line react-hooks/exhaustive-deps -- el helper cierra sobre `pagos`
  const pagadosMes = useMemo(() => obtenerPagosDelMes(hoy).filter(p => estaPagadoEsteMes(p, hoy)), [pagos, hoy])
  // eslint-disable-next-line react-hooks/exhaustive-deps -- obtenerDiasConPagos viene de lib/pagos-recurrentes (lee localStorage); pagos es el trigger
  const diasConPagos = useMemo(() => obtenerDiasConPagos(anyoCalendario, mesCalendario), [pagos, anyoCalendario, mesCalendario])

  const abrirCrear = () => {
    setEditandoId(null)
    setForm(FORM_VACIO)
    setDialogAbierto(true)
  }

  const abrirEditar = (pago: PagoRecurrente) => {
    setEditandoId(pago.id)
    setForm({
      concepto: pago.concepto,
      importe: String(pago.importe),
      dia_pago: String(pago.dia_pago),
      categoria: pago.categoria,
      notas: pago.notas,
    })
    setDialogAbierto(true)
  }

  const guardar = () => {
    const importeNum = parseFloat(form.importe) || 0
    const diaNum = parseInt(form.dia_pago) || 1

    if (!form.concepto.trim() || importeNum <= 0) return

    if (editandoId) {
      actualizarPago(editandoId, {
        concepto: form.concepto.trim(),
        importe: importeNum,
        dia_pago: Math.min(Math.max(diaNum, 1), 31),
        categoria: form.categoria,
        notas: form.notas.trim(),
      })
    } else {
      crearPago({
        concepto: form.concepto.trim(),
        importe: importeNum,
        dia_pago: Math.min(Math.max(diaNum, 1), 31),
        categoria: form.categoria,
        activo: true,
        ultimaFechaPago: null,
        notas: form.notas.trim(),
      })
    }

    setPagos(listarPagos())
    setDialogAbierto(false)
  }

  const handleEliminar = (id: string) => {
    eliminarPago(id)
    setPagos(listarPagos())
    setEliminandoId(null)
  }

  const handleToggle = (id: string) => {
    toggleActivo(id)
    setPagos(listarPagos())
  }

  const handleMarcarPagado = (id: string) => {
    marcarComoPagado(id)
    setPagos(listarPagos())
  }

  const diasEnMes = new Date(anyoCalendario, mesCalendario + 1, 0).getDate()
  const primerDiaSemana = (new Date(anyoCalendario, mesCalendario, 1).getDay() + 6) % 7

  const celdasCalendario: (number | null)[] = [
    ...Array.from({ length: primerDiaSemana }, () => null),
    ...Array.from({ length: diasEnMes }, (_, i) => i + 1),
  ]

  const cambiarMes = (delta: number) => {
    let nuevoMes = mesCalendario + delta
    let nuevoAnyo = anyoCalendario
    if (nuevoMes < 0) { nuevoMes = 11; nuevoAnyo-- }
    if (nuevoMes > 11) { nuevoMes = 0; nuevoAnyo++ }
    setMesCalendario(nuevoMes)
    setAnyoCalendario(nuevoAnyo)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('pagosRecurrentes.titulo')}</h1>
          <p className="text-muted-foreground">{t('pagosRecurrentes.subtitulo')}</p>
        </div>
        <Button onClick={abrirCrear}>
          <Plus className="mr-2 h-4 w-4" /> {t('pagosRecurrentes.nuevoPago')}
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t('pagosRecurrentes.totalMensual')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <CircleDollarSign className="h-5 w-5 text-primary" />
              <span className="text-2xl font-bold">{fmtEuro(totalMensual)}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {pagosActivos.length} {t('pagosRecurrentes.pagosActivos')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t('pagosRecurrentes.pagadosEsteMes')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span className="text-2xl font-bold">{pagadosMes.length}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {fmtEuro(pagadosMes.reduce((s, p) => s + p.importe, 0))}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t('pagosRecurrentes.pendientes')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-orange-500" />
              <span className="text-2xl font-bold">{pendientes.length}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {fmtEuro(pendientes.reduce((s, p) => s + p.importe, 0))}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Repeat className="h-4 w-4" /> {t('pagosRecurrentes.pagosRecurrentes')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {pagos.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">{t('pagosRecurrentes.sinPagos')}</p>
            ) : (
              <div className="space-y-2">
                {pagos.sort((a, b) => a.dia_pago - b.dia_pago).map(pago => {
                  const pagado = estaPagadoEsteMes(pago, hoy)
                  return (
                    <div
                      key={pago.id}
                      className={`flex items-center justify-between rounded-lg border p-3 text-sm transition-opacity ${!pago.activo ? 'opacity-50' : ''}`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Switch
                          checked={pago.activo}
                          onCheckedChange={() => handleToggle(pago.id)}
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium truncate">{pago.concepto}</span>
                            <span className="text-xs rounded-full bg-muted px-2 py-0.5 shrink-0">{pago.categoria}</span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {t('pagosRecurrentes.dia')} {pago.dia_pago} · {fmtEuro(pago.importe)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {pago.activo && !pagado && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleMarcarPagado(pago.id)}
                            className="text-green-600 border-green-300 hover:bg-green-50 hover:text-green-700"
                          >
                            <CheckCircle className="h-3 w-3 mr-1" /> {t('pagosRecurrentes.pagar')}
                          </Button>
                        )}
                        {pagado && (
                          <span className="text-xs text-green-600 font-medium px-2">{t('pagosRecurrentes.pagado')}</span>
                        )}
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => abrirEditar(pago)}>
                          <Pencil className="h-3 w-3" />
                        </Button>
                        {eliminandoId === pago.id ? (
                          <div className="flex items-center gap-1">
                            <Button variant="destructive" size="sm" onClick={() => handleEliminar(pago.id)}>
                              {t('common.confirmar')}
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => setEliminandoId(null)}>
                              {t('common.cancelar')}
                            </Button>
                          </div>
                        ) : (
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setEliminandoId(pago.id)}>
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
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <CalendarDays className="h-4 w-4" /> {t('pagosRecurrentes.calendario')}
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => cambiarMes(-1)}>
                  ‹
                </Button>
                <span className="text-sm font-medium min-w-[120px] text-center">
                  {MESES[mesCalendario]} {anyoCalendario}
                </span>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => cambiarMes(1)}>
                  ›
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-1 text-center">
              {DIAS_SEMANA.map(d => (
                <div key={d} className="text-xs font-medium text-muted-foreground py-1">{d}</div>
              ))}
              {celdasCalendario.map((dia, idx) => {
                if (dia === null) return <div key={`empty-${idx}`} />
                const pagosDelDia = diasConPagos.get(dia) || []
                const esHoy = dia === hoy.getDate() && mesCalendario === hoy.getMonth() && anyoCalendario === hoy.getFullYear()
                return (
                  <div
                    key={dia}
                    className={`relative rounded-lg p-1 text-sm min-h-[2.5rem] ${
                      esHoy ? 'bg-primary/10 ring-1 ring-primary font-bold' : ''
                    } ${pagosDelDia.length > 0 ? 'bg-muted/50' : ''}`}
                  >
                    <span className="text-xs">{dia}</span>
                    {pagosDelDia.length > 0 && (
                      <div className="mt-0.5 flex flex-wrap gap-0.5 justify-center">
                        {pagosDelDia.map(p => (
                          <span
                            key={p.id}
                            className="inline-block h-1.5 w-1.5 rounded-full bg-primary"
                            title={`${p.concepto} - ${fmtEuro(p.importe)}`}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={dialogAbierto} onOpenChange={setDialogAbierto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editandoId ? t('pagosRecurrentes.editarPago') : t('pagosRecurrentes.nuevoPago')}</DialogTitle>
            <DialogDescription>
              {editandoId ? t('pagosRecurrentes.editarDescripcion') : t('pagosRecurrentes.crearDescripcion')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="concepto">{t('pagosRecurrentes.concepto')}</Label>
              <Input
                id="concepto"
                value={form.concepto}
                onChange={e => setForm(f => ({ ...f, concepto: e.target.value }))}
                placeholder={t('pagosRecurrentes.conceptoPlaceholder')}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="importe">{t('pagosRecurrentes.importe')} (€)</Label>
                <Input
                  id="importe"
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.importe}
                  onChange={e => setForm(f => ({ ...f, importe: e.target.value }))}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dia_pago">{t('pagosRecurrentes.diaDePago')}</Label>
                <Input
                  id="dia_pago"
                  type="number"
                  min="1"
                  max="31"
                  value={form.dia_pago}
                  onChange={e => setForm(f => ({ ...f, dia_pago: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="categoria">{t('pagosRecurrentes.categoria')}</Label>
              <select
                id="categoria"
                value={form.categoria}
                onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {CATEGORIAS_PAGO.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notas">{t('pagosRecurrentes.notas')}</Label>
              <Input
                id="notas"
                value={form.notas}
                onChange={e => setForm(f => ({ ...f, notas: e.target.value }))}
                placeholder={t('pagosRecurrentes.notasPlaceholder')}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogAbierto(false)}>
              {t('common.cancelar')}
            </Button>
            <Button
              onClick={guardar}
              disabled={!form.concepto.trim() || !form.importe || parseFloat(form.importe) <= 0}
            >
              {t('common.guardar')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
