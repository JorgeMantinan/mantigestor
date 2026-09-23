'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { toast, Toaster } from 'sonner'
import { Plus, FileText, Trash2, Pencil, ArrowRight, Loader2, Search } from 'lucide-react'
import { usePersonaActiva } from '@/contexts/persona-activa-context'

type EstadoProforma = 'borrador' | 'enviada' | 'aceptada' | 'rechazada'

const ESTADOS_PROFORMA: EstadoProforma[] = ['borrador', 'enviada', 'aceptada', 'rechazada']

const COLOR_ESTADO: Record<EstadoProforma, string> = {
  borrador: 'bg-muted text-muted-foreground border',
  enviada: 'bg-blue-100 text-blue-700 border-transparent dark:bg-blue-900 dark:text-blue-300',
  aceptada: 'bg-emerald-100 text-emerald-700 border-transparent dark:bg-emerald-900 dark:text-emerald-300',
  rechazada: 'bg-red-100 text-red-700 border-transparent dark:bg-red-900 dark:text-red-300',
}

interface Proforma {
  id: string
  perfilId: string
  numero: string
  clienteNombre: string
  clienteNif: string | null
  fecha: string
  validezDias: number
  concepto: string
  baseImponible: number
  iva: number
  total: number
  estado: string
  notas: string | null
  createdAt: string
}

interface Formulario {
  numero: string
  clienteNombre: string
  clienteNif: string
  fecha: string
  validezDias: string
  concepto: string
  base: string
  iva: string
  notas: string
}

function hoyISO(): string {
  return new Date().toISOString().slice(0, 10)
}

const FORM_VACIO: Formulario = {
  numero: '',
  clienteNombre: '',
  clienteNif: '',
  fecha: hoyISO(),
  validezDias: '30',
  concepto: '',
  base: '',
  iva: '21',
  notas: '',
}

function formatMoney(cents: number): string {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(cents / 100)
}

function parsearImporte(valor: string): number {
  const limpio = valor.trim().replace(/\s/g, '').replace(/[€]/g, '').replace(/\.(?=\d{3}\b)/g, '').replace(',', '.')
  const num = parseFloat(limpio)
  return isNaN(num) ? NaN : num
}

function fechaValidez(fecha: string, dias: number): string {
  const d = new Date(fecha)
  if (isNaN(d.getTime())) return fecha
  d.setDate(d.getDate() + dias)
  return d.toISOString().slice(0, 10)
}

function colorEstado(estado: string): string {
  return COLOR_ESTADO[estado as EstadoProforma] ?? COLOR_ESTADO.borrador
}

export default function ProformasPage() {
  const [proformas, setProformas] = useState<Proforma[]>([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [filtroEstado, setFiltroEstado] = useState<'todos' | EstadoProforma>('todos')

  const [dialogAbierto, setDialogAbierto] = useState(false)
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [form, setForm] = useState<Formulario>(FORM_VACIO)
  const [errorForm, setErrorForm] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [accionId, setAccionId] = useState<string | null>(null)

  const router = useRouter()
  const { perfilActivoId } = usePersonaActiva()
  const getSupabase = useCallback(() => createClient(), [])

  const fetchProformas = useCallback(async () => {
    setLoading(true)
    try {
      const { data: { user } } = await getSupabase().auth.getUser()
      if (!user) {
        setLoading(false)
        return
      }
      const perfilId = perfilActivoId ?? user.id
      const { data, error } = await getSupabase()
        .from('proformas')
        .select('*')
        .eq('perfilId', perfilId)
        .order('createdAt', { ascending: false })
      if (error) throw error
      setProformas((data ?? []) as Proforma[])
    } catch {
      toast.error('No se pudieron cargar las proformas')
    } finally {
      setLoading(false)
    }
  }, [getSupabase, perfilActivoId])

  useEffect(() => { fetchProformas() }, [fetchProformas])

  const abrirCrear = () => {
    setEditandoId(null)
    setForm({ ...FORM_VACIO, numero: `PF-${String(proformas.length + 1).padStart(3, '0')}` })
    setErrorForm(null)
    setDialogAbierto(true)
  }

  const abrirEditar = (p: Proforma) => {
    setEditandoId(p.id)
    setForm({
      numero: p.numero,
      clienteNombre: p.clienteNombre,
      clienteNif: p.clienteNif ?? '',
      fecha: p.fecha.slice(0, 10),
      validezDias: String(p.validezDias),
      concepto: p.concepto,
      base: (p.baseImponible / 100).toFixed(2).replace('.', ','),
      iva: String(p.iva),
      notas: p.notas ?? '',
    })
    setErrorForm(null)
    setDialogAbierto(true)
  }

  const validarFormulario = (): string | null => {
    if (!form.numero.trim()) return 'El número de proforma es obligatorio'
    if (!form.clienteNombre.trim()) return 'El nombre del cliente es obligatorio'
    if (!form.concepto.trim()) return 'El concepto es obligatorio'
    if (!form.fecha) return 'La fecha es obligatoria'
    const validez = parseInt(form.validezDias, 10)
    if (isNaN(validez) || validez < 1 || validez > 365) return 'La validez debe estar entre 1 y 365 días'
    const base = parsearImporte(form.base)
    if (isNaN(base) || base <= 0) return 'La base imponible debe ser un importe mayor que 0'
    const iva = parseFloat(form.iva.replace(',', '.'))
    if (isNaN(iva) || iva < 0 || iva > 100) return 'El IVA debe estar entre 0 y 100'
    if (form.clienteNif.trim() && form.clienteNif.trim().length < 7) return 'El NIF del cliente no parece válido'
    return null
  }

  const guardar = async () => {
    const errorValidacion = validarFormulario()
    if (errorValidacion) {
      setErrorForm(errorValidacion)
      return
    }
    setErrorForm(null)
    setGuardando(true)
    try {
      const { data: { user } } = await getSupabase().auth.getUser()
      if (!user) throw new Error('Debes iniciar sesión para guardar proformas')

      const perfilId = perfilActivoId ?? user.id
      const baseCents = Math.round(parsearImporte(form.base) * 100)
      const ivaPct = Math.round(parseFloat(form.iva.replace(',', '.')))
      const total = baseCents + Math.round(baseCents * (ivaPct / 100))

      const payload = {
        numero: form.numero.trim(),
        clienteNombre: form.clienteNombre.trim(),
        clienteNif: form.clienteNif.trim() || null,
        fecha: form.fecha,
        validezDias: parseInt(form.validezDias, 10),
        concepto: form.concepto.trim(),
        baseImponible: baseCents,
        iva: ivaPct,
        total,
        notas: form.notas.trim() || null,
      }

      if (editandoId) {
        const { error } = await getSupabase().from('proformas').update(payload).eq('id', editandoId)
        if (error) throw error
        setProformas(prev => prev.map(p => (p.id === editandoId ? { ...p, ...payload } : p)))
        toast.success('Proforma actualizada')
      } else {
        const nueva: Proforma = {
          id: crypto.randomUUID(),
          perfilId,
          estado: 'borrador',
          createdAt: new Date().toISOString(),
          ...payload,
        }
        const { error } = await getSupabase().from('proformas').insert(nueva)
        if (error) throw error
        setProformas(prev => [nueva, ...prev])
        toast.success('Proforma creada')
      }
      setDialogAbierto(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo guardar la proforma')
    } finally {
      setGuardando(false)
    }
  }

  const eliminar = async (id: string) => {
    setAccionId(id)
    try {
      const { error } = await getSupabase().from('proformas').delete().eq('id', id)
      if (error) throw error
      setProformas(prev => prev.filter(p => p.id !== id))
      toast.success('Proforma eliminada')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo eliminar la proforma')
    } finally {
      setAccionId(null)
    }
  }

  const cambiarEstado = async (id: string, nuevoEstado: EstadoProforma) => {
    setAccionId(id)
    try {
      const { error } = await getSupabase().from('proformas').update({ estado: nuevoEstado }).eq('id', id)
      if (error) throw error
      setProformas(prev => prev.map(p => (p.id === id ? { ...p, estado: nuevoEstado } : p)))
      toast.success(`Proforma marcada como ${nuevoEstado}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo cambiar el estado')
    } finally {
      setAccionId(null)
    }
  }

  const convertirAFactura = async (p: Proforma) => {
    setAccionId(p.id)
    try {
      const { data: { user } } = await getSupabase().auth.getUser()
      if (!user) throw new Error('Debes iniciar sesión para convertir proformas')

      const nuevaFacturaId = crypto.randomUUID()
      const { error: insertError } = await getSupabase().from('facturas').insert({
        id: nuevaFacturaId,
        perfilId: p.perfilId,
        numero: p.numero,
        tipo: 'ingreso',
        emisorReceptor: p.clienteNombre,
        nifContraparte: p.clienteNif,
        fechaEmision: p.fecha,
        fechaVencimiento: fechaValidez(p.fecha, p.validezDias),
        baseImponible: p.baseImponible,
        iva: p.iva,
        total: p.total,
        estado: 'pendiente',
        notas: p.notas ? `${p.concepto} — ${p.notas}` : p.concepto,
        moneda: 'EUR',
        tipoCambio: 1,
        descuentoPorcentaje: 0,
        createdAt: new Date().toISOString(),
      })
      if (insertError) throw insertError

      const { error: updateError } = await getSupabase().from('proformas').update({ estado: 'aceptada' }).eq('id', p.id)
      if (updateError) throw updateError

      setProformas(prev => prev.map(x => (x.id === p.id ? { ...x, estado: 'aceptada' } : x)))
      toast.success('Proforma convertida a factura', {
        description: `Se ha creado la factura ${p.numero}`,
        action: {
          label: 'Ver factura',
          onClick: () => router.push(`/gestoria/facturas/${nuevaFacturaId}`),
        },
      })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo convertir la proforma en factura')
    } finally {
      setAccionId(null)
    }
  }

  const visibles = useMemo(() => {
    let result = proformas
    if (filtroEstado !== 'todos') result = result.filter(p => p.estado === filtroEstado)
    if (busqueda.trim()) {
      const q = busqueda.toLowerCase()
      result = result.filter(
        p => p.clienteNombre.toLowerCase().includes(q) || p.numero.toLowerCase().includes(q)
      )
    }
    return result
  }, [proformas, filtroEstado, busqueda])

  const totalPreview = useMemo(() => {
    const base = parsearImporte(form.base)
    if (isNaN(base)) return null
    const iva = parseFloat(form.iva.replace(',', '.'))
    if (isNaN(iva)) return null
    const baseCents = Math.round(base * 100)
    return baseCents + Math.round(baseCents * (iva / 100))
  }, [form.base, form.iva])

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-heading font-bold tracking-tight">Proformas</h1>
          <p className="text-muted-foreground">Crea proformas, envíalas al cliente y conviértelas en facturas.</p>
        </div>
        <Button onClick={abrirCrear}>
          <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
          Nueva proforma
        </Button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input
            placeholder="Buscar por cliente o número..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            className="pl-9"
            aria-label="Buscar proformas"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {(['todos', ...ESTADOS_PROFORMA] as const).map(e => (
            <Button
              key={e}
              variant={filtroEstado === e ? 'secondary' : 'outline'}
              size="sm"
              onClick={() => setFiltroEstado(e)}
            >
              {e === 'todos' ? 'Todos' : e.charAt(0).toUpperCase() + e.slice(1)}
            </Button>
          ))}
        </div>
      </div>

      {loading ? (
        <Card>
          <CardContent className="flex items-center justify-center gap-2 py-8 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Cargando proformas...
          </CardContent>
        </Card>
      ) : visibles.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-12">
            <FileText className="h-12 w-12 text-muted-foreground" aria-hidden="true" />
            <div className="text-center">
              <p className="font-medium">
                {busqueda || filtroEstado !== 'todos' ? 'No hay resultados' : 'Todavía no hay proformas'}
              </p>
              <p className="text-sm text-muted-foreground">
                {busqueda || filtroEstado !== 'todos'
                  ? 'Prueba con otros filtros de búsqueda.'
                  : 'Crea tu primera proforma con el botón "Nueva proforma".'}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left font-medium">Número</th>
                <th className="px-4 py-3 text-left font-medium">Cliente</th>
                <th className="px-4 py-3 text-left font-medium">Concepto</th>
                <th className="px-4 py-3 text-left font-medium">Fecha</th>
                <th className="px-4 py-3 text-right font-medium">Total</th>
                <th className="px-4 py-3 text-center font-medium">Estado</th>
                <th className="px-4 py-3 text-right font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {visibles.map(p => (
                <tr key={p.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium">{p.numero}</td>
                  <td className="px-4 py-3">
                    <div>{p.clienteNombre}</div>
                    {p.clienteNif && <div className="text-xs text-muted-foreground">{p.clienteNif}</div>}
                  </td>
                  <td className="max-w-[220px] truncate px-4 py-3 text-muted-foreground">{p.concepto}</td>
                  <td className="px-4 py-3">
                    <div>{new Date(p.fecha).toLocaleDateString('es-ES')}</div>
                    <div className="text-xs text-muted-foreground">válida {p.validezDias} días</div>
                  </td>
                  <td className="px-4 py-3 text-right font-medium">{formatMoney(p.total)}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-semibold ${colorEstado(p.estado)}`}>
                      {p.estado}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center justify-end gap-1">
                      {p.estado !== 'aceptada' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => void convertirAFactura(p)}
                          disabled={accionId === p.id}
                          title="Convertir a factura"
                        >
                          {accionId === p.id ? (
                            <Loader2 className="mr-1 h-3 w-3 animate-spin" aria-hidden="true" />
                          ) : (
                            <ArrowRight className="mr-1 h-3 w-3" aria-hidden="true" />
                          )}
                          Convertir a factura
                        </Button>
                      )}
                      <select
                        value={ESTADOS_PROFORMA.includes(p.estado as EstadoProforma) ? p.estado : 'borrador'}
                        onChange={e => void cambiarEstado(p.id, e.target.value as EstadoProforma)}
                        disabled={accionId === p.id}
                        aria-label={`Cambiar estado de ${p.numero}`}
                        className="h-8 rounded-md border border-input bg-background px-2 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        {ESTADOS_PROFORMA.map(e => (
                          <option key={e} value={e} className="bg-background text-foreground">
                            {e.charAt(0).toUpperCase() + e.slice(1)}
                          </option>
                        ))}
                      </select>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        title="Editar proforma"
                        onClick={() => abrirEditar(p)}
                      >
                        <Pencil className="h-4 w-4" aria-hidden="true" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive"
                            aria-label={`Eliminar proforma ${p.numero}`}
                          >
                            <Trash2 className="h-4 w-4" aria-hidden="true" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>¿Eliminar esta proforma?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Se eliminará la proforma {p.numero} de {p.clienteNombre}. Esta acción no se puede
                              deshacer.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => void eliminar(p.id)}>Eliminar</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={dialogAbierto} onOpenChange={setDialogAbierto}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{editandoId ? 'Editar proforma' : 'Nueva proforma'}</DialogTitle>
            <DialogDescription>
              Rellena los datos del cliente y el concepto. El total se calcula automáticamente.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="proforma-numero">Número</Label>
              <Input id="proforma-numero" value={form.numero} onChange={e => setForm(f => ({ ...f, numero: e.target.value }))} placeholder="PF-001" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="proforma-fecha">Fecha</Label>
              <Input id="proforma-fecha" type="date" value={form.fecha} onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="proforma-cliente">Cliente *</Label>
              <Input id="proforma-cliente" value={form.clienteNombre} onChange={e => setForm(f => ({ ...f, clienteNombre: e.target.value }))} placeholder="Nombre del cliente" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="proforma-nif">NIF del cliente</Label>
              <Input id="proforma-nif" value={form.clienteNif} onChange={e => setForm(f => ({ ...f, clienteNif: e.target.value }))} placeholder="B-12345678" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="proforma-validez">Validez (días)</Label>
              <Input id="proforma-validez" type="number" min={1} max={365} value={form.validezDias} onChange={e => setForm(f => ({ ...f, validezDias: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="proforma-iva">IVA (%)</Label>
              <select
                id="proforma-iva"
                value={form.iva}
                onChange={e => setForm(f => ({ ...f, iva: e.target.value }))}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="21">21 %</option>
                <option value="10">10 %</option>
                <option value="4">4 %</option>
                <option value="0">0 %</option>
              </select>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="proforma-concepto">Concepto *</Label>
              <Input id="proforma-concepto" value={form.concepto} onChange={e => setForm(f => ({ ...f, concepto: e.target.value }))} placeholder="Diseño de identidad corporativa" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="proforma-base">Base imponible (€) *</Label>
              <Input id="proforma-base" inputMode="decimal" value={form.base} onChange={e => setForm(f => ({ ...f, base: e.target.value }))} placeholder="1000,00" />
            </div>
            <div className="flex flex-col justify-end">
              <span className="text-xs text-muted-foreground">Total calculado</span>
              <span className="text-lg font-semibold">
                {totalPreview !== null ? formatMoney(totalPreview) : '—'}
              </span>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="proforma-notas">Notas</Label>
              <Textarea id="proforma-notas" rows={3} value={form.notas} onChange={e => setForm(f => ({ ...f, notas: e.target.value }))} placeholder="Condiciones, forma de pago, etc." />
            </div>
          </div>

          {errorForm && <p className="text-sm text-destructive">{errorForm}</p>}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogAbierto(false)} disabled={guardando}>
              Cancelar
            </Button>
            <Button onClick={() => void guardar()} disabled={guardando}>
              {guardando ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                  Guardando...
                </>
              ) : editandoId ? (
                'Guardar cambios'
              ) : (
                'Crear proforma'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Toaster richColors position="top-right" />
    </div>
  )
}
