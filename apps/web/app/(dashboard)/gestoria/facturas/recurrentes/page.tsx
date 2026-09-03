'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ChevronLeft, Plus, Trash2, Pause, Play, RefreshCw, Download, FileText, Zap, CircleDollarSign, CalendarDays, Wallet, Paperclip, Link as LinkIcon } from 'lucide-react'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { VistaPreviaPlantilla } from '@/components/vista-previa-plantilla'
import { generarFacturaClientePDF } from '@/lib/factura-cliente-pdf'
import { DragDropList } from '@/components/drag-drop-list'

const TIPOS_IVA = [21, 10, 4, 0] as const

type TriggerTipo = 'umbral_gasto' | 'fecha_especifica' | 'saldo_bajo'

interface TriggerConfig {
  triggerTipo: TriggerTipo | null
  triggerValor: number | null
}

function parseTriggerConfig(notas: string | null): TriggerConfig {
  const data = parseNotasData(notas)
  if (data.triggerTipo && ['umbral_gasto', 'fecha_especifica', 'saldo_bajo'].includes(data.triggerTipo)) {
    return { triggerTipo: data.triggerTipo, triggerValor: data.triggerValor ?? null }
  }
  return { triggerTipo: null, triggerValor: null }
}

function parseAttachments(notas: string | null): Attachment[] {
  const data = parseNotasData(notas)
  return data.attachments ?? []
}

function serializarNotasConAttachments(notas: string | null, attachments: Attachment[]): string {
  const data = parseNotasData(notas)
  data.attachments = attachments
  return serializarNotasData(data)
}

interface FacturaRecurrente {
  id: string
  tipo: string
  numero: string
  emisorReceptor: string
  nifContraparte: string | null
  baseImponible: number
  iva: number
  diaGeneracion: number
  diaEmail: number | null
  activa: boolean
  ultimaGeneracion: string | null
  createdAt: string
  notas: string | null
}

interface Attachment {
  nombre: string
  url: string
}

interface NotasData {
  triggerTipo?: TriggerTipo | null
  triggerValor?: number | null
  attachments?: Attachment[]
}

function parseNotasData(notas: string | null): NotasData {
  if (!notas) return {}
  try {
    const parsed = JSON.parse(notas)
    return parsed as NotasData
  } catch { return {} }
}

function serializarNotasData(data: NotasData): string {
  return JSON.stringify(data)
}

interface PerfilEmpresa {
  nombre: string | null
  empresa_nombre: string | null
  empresa_nif: string | null
  empresa_direccion: string | null
  notasPie: string | null
  logoBase64: string | null
  firmaBase64: string | null
}

export default function FacturasRecurrentesPage() {
  const [plantillas, setPlantillas] = useState<FacturaRecurrente[]>([])
  const [loading, setLoading] = useState(true)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const [perfil, setPerfil] = useState<PerfilEmpresa | null>(null)
  const [generandoPdfId, setGenerandoPdfId] = useState<string | null>(null)
  const [creandoAhoraId, setCreandoAhoraId] = useState<string | null>(null)
  const [batchProgress, setBatchProgress] = useState<{ actual: number; total: number } | null>(null)
  const [batchResult, setBatchResult] = useState<{ generadas: number; omitidas: number } | null>(null)

  // Form state
  const [tipo, setTipo] = useState('gasto')
  const [numero, setNumero] = useState('')
  const [emisorReceptor, setEmisorReceptor] = useState('')
  const [nifContraparte, setNifContraparte] = useState('')
  const [baseImponible, setBaseImponible] = useState('')
  const [iva, setIva] = useState('21')
  const [diaGeneracion, setDiaGeneracion] = useState('5')
  const [diaEmail, setDiaEmail] = useState('')
  const [triggerTipo, setTriggerTipo] = useState<TriggerTipo | null>(null)
  const [triggerValor, setTriggerValor] = useState('')
  const [saldoBanco, setSaldoBanco] = useState('')
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [editAttachments, setEditAttachments] = useState<Attachment[]>([])
  const [editingPlantilla, setEditingPlantilla] = useState<FacturaRecurrente | null>(null)
  const [nuevoAttachmentNombre, setNuevoAttachmentNombre] = useState('')
  const [nuevoAttachmentUrl, setNuevoAttachmentUrl] = useState('')

  const ORDER_KEY = 'facturas-recurrentes-orden'

  const loadSavedOrder = useCallback((ids: string[]): string[] => {
    try {
      const saved = localStorage.getItem(ORDER_KEY)
      if (!saved) return ids
      const order: string[] = JSON.parse(saved)
      const idSet = new Set(ids)
      const ordered = order.filter(id => idSet.has(id))
      const remaining = ids.filter(id => !order.includes(id))
      return [...ordered, ...remaining]
    } catch {
      return ids
    }
  }, [])

  const saveOrder = useCallback((ids: string[]) => {
    try {
      localStorage.setItem(ORDER_KEY, JSON.stringify(ids))
    } catch { /* ignore */ }
  }, [])

  const getSupabase = useCallback(() => createClient(), [])

  const fetchPlantillas = useCallback(async () => {
    const { data: { user } } = await getSupabase().auth.getUser()
    if (!user) { setLoading(false); return }

    const [plantillasRes, perfilRes] = await Promise.all([
      getSupabase()
        .from('facturas_recurrentes')
        .select('*')
        .eq('perfilId', user.id)
        .order('createdAt', { ascending: false }),
      getSupabase()
        .from('perfiles')
        .select('nombre, empresa_nombre, empresa_nif, empresa_direccion, notasPie, logoBase64, firmaBase64')
        .eq('userId', user.id)
        .single(),
    ])

    const raw = (plantillasRes.data as FacturaRecurrente[]) ?? []
    const ids = raw.map(p => p.id)
    const orderedIds = loadSavedOrder(ids)
    const ordered = orderedIds.map(id => raw.find(p => p.id === id)).filter(Boolean) as FacturaRecurrente[]
    setPlantillas(ordered)
    if (perfilRes.data) setPerfil(perfilRes.data as PerfilEmpresa)
    setLoading(false)
  }, [getSupabase])

  useEffect(() => { fetchPlantillas() }, [fetchPlantillas])

  const handleReorder = useCallback((reordered: FacturaRecurrente[]) => {
    setPlantillas(reordered)
    saveOrder(reordered.map(p => p.id))
  }, [saveOrder])

  const crearPlantilla = async () => {
    if (!numero || !emisorReceptor || !baseImponible) {
      setError('Rellena todos los campos obligatorios')
      return
    }
    if (triggerTipo && !triggerValor) {
      setError('Introduce un valor para el umbral del trigger')
      return
    }
    setGuardando(true)
    setError('')
    try {
      const notasData: NotasData = {
        triggerTipo: triggerTipo ?? null,
        triggerValor: triggerTipo ? parseFloat(triggerValor) || null : null,
        attachments: attachments.length > 0 ? attachments : [],
      }
      const notas = serializarNotasData(notasData)

      const res = await fetch('/api/facturas/recurrentes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo,
          numero,
          emisorReceptor,
          nifContraparte: nifContraparte || null,
          baseImponible: parseFloat(baseImponible),
          iva: parseInt(iva),
          diaGeneracion: parseInt(diaGeneracion),
          diaEmail: diaEmail ? parseInt(diaEmail) : null,
          notas,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        setError(err.error || 'Error al crear')
        setGuardando(false)
        return
      }
      setNumero('')
      setEmisorReceptor('')
      setNifContraparte('')
      setBaseImponible('')
      setTriggerTipo(null)
      setTriggerValor('')
      setAttachments([])
      setMostrarForm(false)
      await fetchPlantillas()
    } catch {
      setError('Error al conectar con el servidor')
    }
    setGuardando(false)
  }

  const toggleActiva = async (id: string, activa: boolean) => {
    await fetch(`/api/facturas/recurrentes/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ activa: !activa }),
    })
    setPlantillas(prev => prev.map(p => p.id === id ? { ...p, activa: !activa } : p))
  }

  const eliminar = async (id: string) => {
    await fetch(`/api/facturas/recurrentes/${id}`, { method: 'DELETE' })
    setPlantillas(prev => prev.filter(p => p.id !== id))
  }

  const generarFactura = async (plantilla: FacturaRecurrente) => {
    const ahora = new Date()
    const mes = ahora.getMonth() + 1
    const anyo = ahora.getFullYear()
    const numero = `${plantilla.numero}-${anyo}-${String(mes).padStart(2, '0')}`
    const baseImponible = plantilla.baseImponible
    const importeIva = Math.round(baseImponible * (plantilla.iva / 100))
    const total = baseImponible + importeIva

    const { data: { user } } = await getSupabase().auth.getUser()
    if (!user) return

    const { data: perfil } = await getSupabase().from('perfiles').select('id').eq('userId', user.id).single()
    if (!perfil) return

    const { error } = await getSupabase().from('facturas').insert({
      id: crypto.randomUUID(),
      perfilId: perfil.id,
      numero,
      tipo: plantilla.tipo,
      emisorReceptor: plantilla.emisorReceptor,
      nifContraparte: plantilla.nifContraparte,
      fechaEmision: ahora.toISOString().slice(0, 10),
      baseImponible,
      iva: plantilla.iva,
      total,
      estado: 'pendiente',
    })

    if (!error) {
      await fetch(`/api/facturas/recurrentes/${plantilla.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ultimaGeneracion: ahora.toISOString() }),
      })
      setPlantillas(prev => prev.map(p =>
        p.id === plantilla.id ? { ...p, ultimaGeneracion: ahora.toISOString() } : p
      ))
    }
  }

  const descargarPdfPlantilla = async (p: FacturaRecurrente) => {
    setGenerandoPdfId(p.id)
    try {
      const ahora = new Date()
      const numeroSiguiente = `${p.numero}-${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, '0')}`
      const importeIva = Math.round(p.baseImponible * (p.iva / 100))
      const total = p.baseImponible + importeIva

      await generarFacturaClientePDF({
        numero: numeroSiguiente,
        emisorReceptor: p.emisorReceptor,
        nifContraparte: p.nifContraparte,
        fechaEmision: ahora.toISOString().slice(0, 10),
        baseImponible: p.baseImponible,
        iva: p.iva,
        total,
        tipo: p.tipo,
        empresaNombre: perfil?.empresa_nombre ?? perfil?.nombre ?? undefined,
        empresaDireccion: perfil?.empresa_direccion ?? undefined,
        empresaNif: perfil?.empresa_nif ?? undefined,
        notas: perfil?.notasPie ?? null,
        logoBase64: perfil?.logoBase64 ?? undefined,
        firmaBase64: perfil?.firmaBase64 ?? undefined,
      })
    } finally {
      setGenerandoPdfId(null)
    }
  }

  const generarFacturaAhora = async (plantilla: FacturaRecurrente) => {
    setCreandoAhoraId(plantilla.id)
    try {
      await generarFactura(plantilla)
    } finally {
      setCreandoAhoraId(null)
    }
  }

  const calcularProximaGeneracion = (diaGeneracion: number): Date => {
    const ahora = new Date()
    const proxima = new Date(ahora.getFullYear(), ahora.getMonth(), diaGeneracion)
    if (proxima <= ahora) {
      proxima.setMonth(proxima.getMonth() + 1)
    }
    return proxima
  }

  const generarFacturasPendientes = async () => {
    const ahora = new Date()
    const mes = ahora.getMonth() + 1
    const anyo = ahora.getFullYear()
    const diaActual = ahora.getDate()

    const { data: { user } } = await getSupabase().auth.getUser()
    if (!user) return

    const { data: perfil } = await getSupabase().from('perfiles').select('id').eq('userId', user.id).single()
    if (!perfil) return

    const primerDiaMes = `${anyo}-${String(mes).padStart(2, '0')}-01`
    const ultimoDiaMes = `${anyo}-${String(mes).padStart(2, '0')}-31`

    const plantillasPendientes = plantillas.filter(
      p => p.activa && p.diaGeneracion <= diaActual
    )

    if (plantillasPendientes.length === 0) {
      setBatchResult({ generadas: 0, omitidas: 0 })
      setTimeout(() => setBatchResult(null), 4000)
      return
    }

    setBatchProgress({ actual: 0, total: plantillasPendientes.length })
    let generadas = 0
    let omitidas = 0

    for (let i = 0; i < plantillasPendientes.length; i++) {
      const p = plantillasPendientes[i]
      if (!p) continue
      setBatchProgress({ actual: i + 1, total: plantillasPendientes.length })

      const { triggerTipo, triggerValor } = parseTriggerConfig(p.notas)

      if (triggerTipo === 'umbral_gasto' && triggerValor != null) {
        const { data: gastos } = await getSupabase()
          .from('facturas')
          .select('total')
          .eq('perfilId', perfil.id)
          .eq('tipo', 'gasto')
          .gte('fechaEmision', primerDiaMes)
          .lte('fechaEmision', ultimoDiaMes)
        const totalGastos = (gastos ?? []).reduce((sum, f) => sum + (f.total ?? 0), 0)
        if (totalGastos < triggerValor) {
          omitidas++
          continue
        }
      }

      if (triggerTipo === 'saldo_bajo' && triggerValor != null) {
        const { data: ultimasFacturas } = await getSupabase()
          .from('facturas')
          .select('total, tipo')
          .eq('perfilId', perfil.id)
          .lte('fechaEmision', ultimoDiaMes)
          .order('fechaEmision', { ascending: false })
          .limit(50)
        const saldoCalculado = (ultimasFacturas ?? []).reduce((sum, f) => {
          return sum + (f.tipo === 'ingreso' ? (f.total ?? 0) : -(f.total ?? 0))
        }, 0)
        if (saldoCalculado >= triggerValor) {
          omitidas++
          continue
        }
      }

      const numero = `${p.numero}-${anyo}-${String(mes).padStart(2, '0')}`

      const { data: existente } = await getSupabase()
        .from('facturas')
        .select('id')
        .eq('perfilId', perfil.id)
        .eq('numero', numero)
        .limit(1)
        .maybeSingle()

      if (existente) {
        omitidas++
        continue
      }

      const baseImponible = p.baseImponible
      const importeIva = Math.round(baseImponible * (p.iva / 100))
      const total = baseImponible + importeIva

      const { error } = await getSupabase().from('facturas').insert({
        id: crypto.randomUUID(),
        perfilId: perfil.id,
        numero,
        tipo: p.tipo,
        emisorReceptor: p.emisorReceptor,
        nifContraparte: p.nifContraparte,
        fechaEmision: ahora.toISOString().slice(0, 10),
        baseImponible,
        iva: p.iva,
        total,
        estado: 'pendiente',
      })

      if (!error) {
        generadas++
        await fetch(`/api/facturas/recurrentes/${p.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ultimaGeneracion: ahora.toISOString() }),
        })
        setPlantillas(prev => prev.map(pl =>
          pl.id === p.id ? { ...pl, ultimaGeneracion: ahora.toISOString() } : pl
        ))
      }
    }

    setBatchProgress(null)
    setBatchResult({ generadas, omitidas })
    setTimeout(() => setBatchResult(null), 5000)
  }

  const formatMoney = (cents: number) =>
    new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(cents / 100)

  const nombreMes = (dia: number) => `Día ${dia} de cada mes`

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/gestoria/facturas">
            <Button variant="ghost" size="icon" aria-label="Volver a facturas">
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-heading font-bold tracking-tight">Facturas recurrentes</h1>
            <p className="text-sm text-muted-foreground">
              Plantillas que se generan automáticamente cada mes
            </p>
          </div>
        </div>
        <Button size="sm" onClick={() => setMostrarForm(!mostrarForm)}>
          <Plus className="mr-1 h-3 w-3" />
          Nueva recurrente
        </Button>
      </div>

      {!loading && plantillas.length > 0 && (
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            disabled={batchProgress !== null}
            onClick={() => void generarFacturasPendientes()}
          >
            {batchProgress ? (
              <RefreshCw className="mr-1 h-3 w-3 animate-spin" />
            ) : (
              <Zap className="mr-1 h-3 w-3" />
            )}
            {batchProgress
              ? `Generando ${batchProgress.actual}/${batchProgress.total}...`
              : 'Generar todas las pendientes del mes'}
          </Button>
          {batchResult && (
            <span className="text-sm text-muted-foreground">
              {batchResult.generadas > 0 && `${batchResult.generadas} generada${batchResult.generadas !== 1 ? 's' : ''}`}
              {batchResult.generadas > 0 && batchResult.omitidas > 0 && ', '}
              {batchResult.omitidas > 0 && `${batchResult.omitidas} omitida${batchResult.omitidas !== 1 ? 's' : ''}`}
              {batchResult.generadas === 0 && batchResult.omitidas === 0 && 'No hay pendientes este mes'}
            </span>
          )}
        </div>
      )}

      {mostrarForm && (
        <Card>
          <CardHeader>
            <CardTitle>Nueva factura recurrente</CardTitle>
            <CardDescription>
              Se generará automáticamente el día que elijas de cada mes
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <select value={tipo} onChange={e => setTipo(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                  <option value="ingreso">Ingreso (emitida)</option>
                  <option value="gasto">Gasto (recibida)</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Nº factura (prefijo)</Label>
                <Input value={numero} onChange={e => setNumero(e.target.value)} placeholder="F-2024-" />
                <p className="text-xs text-muted-foreground">Se añade automáticamente YYYY-MM</p>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Nombre / proveedor</Label>
                <Input value={emisorReceptor} onChange={e => setEmisorReceptor(e.target.value)} placeholder="Empresa XYZ" />
              </div>
              <div className="space-y-2">
                <Label>NIF/CIF</Label>
                <Input value={nifContraparte} onChange={e => setNifContraparte(e.target.value)} placeholder="B12345678" />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label>Base imponible (€)</Label>
                <Input type="number" step="0.01" value={baseImponible} onChange={e => setBaseImponible(e.target.value)} placeholder="100.00" />
              </div>
              <div className="space-y-2">
                <Label>IVA (%)</Label>
                <select value={iva} onChange={e => setIva(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                  {TIPOS_IVA.map(t => <option key={t} value={t}>{t}%</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Día del mes</Label>
                <select value={diaGeneracion} onChange={e => setDiaGeneracion(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                  {Array.from({ length: 28 }, (_, i) => i + 1).map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Día de aviso por email</Label>
                <select value={diaEmail} onChange={e => setDiaEmail(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                  <option value="">Sin aviso</option>
                  {Array.from({ length: 28 }, (_, i) => i + 1).map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground">Email automático con recordatorio de facturas pendientes</p>
              </div>
            </div>
            <div className="space-y-3 rounded-md border p-4">
              <Label className="text-sm font-medium">Trigger de generación</Label>
              <p className="text-xs text-muted-foreground">
                Elige cuándo se genera esta factura. Por defecto se genera en el día del mes seleccionado.
              </p>
              <div className="space-y-2">
                {([
                  { value: null, label: 'Por día del mes (por defecto)', icon: CalendarDays, desc: `Se genera el día ${diaGeneracion} de cada mes` },
                  { value: 'umbral_gasto' as TriggerTipo, label: 'Cuando los gastos superan umbral', icon: CircleDollarSign, desc: 'Genera cuando el total de gastos del mes supera un importe' },
                  { value: 'fecha_especifica' as TriggerTipo, label: 'En fecha específica del mes', icon: CalendarDays, desc: `Se genera el día ${diaGeneracion} de cada mes (igual que por defecto)` },
                  { value: 'saldo_bajo' as TriggerTipo, label: 'Cuando el saldo baja del umbral', icon: Wallet, desc: 'Genera cuando el saldo del banco baja de un importe' },
                ] as const).map(opt => (
                  <label key={opt.value ?? 'none'} className={`flex items-start gap-3 rounded-md border p-3 cursor-pointer transition-colors ${triggerTipo === opt.value ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'}`}>
                    <input
                      type="radio"
                      name="triggerTipo"
                      checked={triggerTipo === opt.value}
                      onChange={() => setTriggerTipo(opt.value)}
                      className="mt-0.5"
                    />
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <opt.icon className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-sm font-medium">{opt.label}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{opt.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
              {triggerTipo && (
                <div className="grid gap-4 sm:grid-cols-2 pt-2">
                  <div className="space-y-2">
                    <Label>{triggerTipo === 'fecha_especifica' ? 'Día del mes' : 'Umbral (€)'}</Label>
                    {triggerTipo === 'fecha_especifica' ? (
                      <select value={triggerValor || diaGeneracion} onChange={e => setTriggerValor(e.target.value)}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                        {Array.from({ length: 28 }, (_, i) => i + 1).map(d => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                      </select>
                    ) : (
                      <Input type="number" step="0.01" value={triggerValor} onChange={e => setTriggerValor(e.target.value)} placeholder={triggerTipo === 'umbral_gasto' ? '500.00' : '1000.00'} />
                    )}
                    <p className="text-xs text-muted-foreground">
                      {triggerTipo === 'umbral_gasto' && 'Se genera la factura cuando los gastos del mes superen este importe'}
                      {triggerTipo === 'fecha_especifica' && 'Se genera en el día seleccionado de cada mes'}
                      {triggerTipo === 'saldo_bajo' && 'Se genera cuando el saldo del banco baje de este importe'}
                    </p>
                  </div>
                  {triggerTipo === 'saldo_bajo' && (
                    <div className="space-y-2">
                      <Label>Saldo actual del banco (€) <span className="text-muted-foreground text-xs">(manual)</span></Label>
                      <Input type="number" step="0.01" value={saldoBanco} onChange={e => setSaldoBanco(e.target.value)} placeholder="0.00" />
                      <p className="text-xs text-muted-foreground">Introduce tu saldo actual para referencia</p>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="space-y-3 rounded-md border p-4">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Paperclip className="h-3.5 w-3.5" aria-hidden="true" />
                Documentos adjuntos (opcional)
              </Label>
              <p className="text-xs text-muted-foreground">
                Añade enlaces a documentos relacionados con esta plantilla (contratos, presupuestos, etc.)
              </p>
              {attachments.length > 0 && (
                <div className="space-y-1.5">
                  {attachments.map((att, i) => (
                    <div key={i} className="flex items-center justify-between rounded-md bg-muted/50 px-3 py-1.5 text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText className="h-3 w-3 shrink-0 text-muted-foreground" aria-hidden="true" />
                        <span className="font-medium truncate">{att.nombre}</span>
                        <span className="text-muted-foreground truncate">({att.url})</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 shrink-0"
                        onClick={() => setAttachments(prev => prev.filter((_, j) => j !== i))}
                        aria-label={`Eliminar ${att.nombre}`}
                      >
                        <Trash2 className="h-3 w-3" aria-hidden="true" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              <div className="grid gap-2 sm:grid-cols-[1fr_2fr_auto]">
                <Input
                  value={nuevoAttachmentNombre}
                  onChange={e => setNuevoAttachmentNombre(e.target.value)}
                  placeholder="Nombre del documento"
                />
                <Input
                  value={nuevoAttachmentUrl}
                  onChange={e => setNuevoAttachmentUrl(e.target.value)}
                  placeholder="URL del documento"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!nuevoAttachmentNombre.trim() || !nuevoAttachmentUrl.trim()}
                  onClick={() => {
                    setAttachments(prev => [...prev, { nombre: nuevoAttachmentNombre.trim(), url: nuevoAttachmentUrl.trim() }])
                    setNuevoAttachmentNombre('')
                    setNuevoAttachmentUrl('')
                  }}
                >
                  <Plus className="h-3 w-3" aria-hidden="true" />
                </Button>
              </div>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setMostrarForm(false)}>Cancelar</Button>
              <Button onClick={() => void crearPlantilla()} disabled={guardando}>
                {guardando ? 'Guardando...' : 'Crear plantilla'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <RefreshCw className="mx-auto mb-2 h-4 w-4 animate-spin" />
            Cargando plantillas...
          </CardContent>
        </Card>
      ) : plantillas.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="font-medium">No hay facturas recurrentes</p>
            <p className="text-sm text-muted-foreground mt-1">
              Crea una plantilla para que se generen facturas automáticamente cada mes
            </p>
          </CardContent>
        </Card>
      ) : (
        <DragDropList
          items={plantillas}
          onReorder={handleReorder}
          keyExtractor={p => p.id}
          renderItem={(p, _index, dragHandle) => {
            const importeIva = Math.round(p.baseImponible * (p.iva / 100))
            const total = p.baseImponible + importeIva
            const ahora = new Date()
            const numeroSiguiente = `${p.numero}-${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, '0')}`

            return (
              <Card className={!p.activa ? 'opacity-60' : ''}>
                <CardContent className="py-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-start gap-2">
                      {dragHandle}
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className={`inline-block h-2 w-2 rounded-full ${p.activa ? 'bg-green-500' : 'bg-gray-400'}`} />
                          <span className="font-medium">{p.emisorReceptor}</span>
                          {p.nifContraparte && (
                            <span className="text-xs text-muted-foreground">({p.nifContraparte})</span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                          <span>{p.numero}-YYYY-MM</span>
                          <span>·</span>
                          {(() => {
                            const { triggerTipo, triggerValor } = parseTriggerConfig(p.notas)
                            if (triggerTipo === 'umbral_gasto' && triggerValor != null) {
                              return <span className="inline-flex items-center gap-1 text-amber-600"><CircleDollarSign className="h-3 w-3" /> Gasto &gt; {formatMoney(triggerValor * 100)}</span>
                            }
                            if (triggerTipo === 'saldo_bajo' && triggerValor != null) {
                              return <span className="inline-flex items-center gap-1 text-orange-600"><Wallet className="h-3 w-3" /> Saldo &lt; {formatMoney(triggerValor * 100)}</span>
                            }
                            return <span>{nombreMes(p.diaGeneracion)}</span>
                          })()}
                          {p.diaEmail && (
                            <>
                              <span>·</span>
                              <span className="text-blue-600">Email día {p.diaEmail}</span>
                            </>
                          )}
                          <span>·</span>
                          <span className="capitalize">{p.tipo === 'ingreso' ? 'Ingreso' : 'Gasto'}</span>
                        </div>
                        {p.ultimaGeneracion && (
                          <p className="text-xs text-muted-foreground">
                            Última generación: {new Date(p.ultimaGeneracion).toLocaleDateString('es-ES')}
                          </p>
                        )}
                        {parseAttachments(p.notas).length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {parseAttachments(p.notas).map((att, i) => (
                              <Badge key={i} variant="secondary" className="text-xs gap-1">
                                <Paperclip className="h-2.5 w-2.5" aria-hidden="true" />
                                {att.nombre}
                              </Badge>
                            ))}
                          </div>
                        )}
                        {p.activa && (
                          <p className="text-xs text-muted-foreground">
                            Próxima generación: {calcularProximaGeneracion(p.diaGeneracion).toLocaleDateString('es-ES')}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{formatMoney(p.baseImponible)}</span>
                      <span className="text-xs text-muted-foreground">+{p.iva}%</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap border-t pt-3">
                    <VistaPreviaPlantilla datos={{
                      numero: numeroSiguiente,
                      emisorReceptor: p.emisorReceptor,
                      nifContraparte: p.nifContraparte,
                      fechaEmision: ahora.toISOString().slice(0, 10),
                      baseImponible: p.baseImponible,
                      iva: p.iva,
                      total,
                      tipo: p.tipo,
                      empresaNombre: perfil?.empresa_nombre ?? perfil?.nombre ?? undefined,
                      empresaDireccion: perfil?.empresa_direccion ?? undefined,
                      empresaNif: perfil?.empresa_nif ?? undefined,
                      notas: perfil?.notasPie ?? null,
                      logoBase64: perfil?.logoBase64 ?? undefined,
                    }} />

                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      disabled={generandoPdfId === p.id}
                      onClick={() => void descargarPdfPlantilla(p)}
                    >
                      {generandoPdfId === p.id ? (
                        <RefreshCw className="mr-1 h-3 w-3 animate-spin" />
                      ) : (
                        <Download className="mr-1 h-3 w-3" />
                      )}
                      Descargar PDF
                    </Button>

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm" className="h-7 text-xs" disabled={!p.activa || creandoAhoraId === p.id}>
                          {creandoAhoraId === p.id ? (
                            <RefreshCw className="mr-1 h-3 w-3 animate-spin" />
                          ) : (
                            <FileText className="mr-1 h-3 w-3" />
                          )}
                          Generar ahora
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Generar factura ahora</AlertDialogTitle>
                          <AlertDialogDescription>
                            Se creará la factura <strong>{numeroSiguiente}</strong> con fecha de hoy ({ahora.toLocaleDateString('es-ES')}) por importe de <strong>{formatMoney(total)}</strong> (IVA {p.iva}% incluido).
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => void generarFacturaAhora(p)}>
                            Confirmar generación
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => {
                        setEditingPlantilla(p)
                        setEditAttachments(parseAttachments(p.notas))
                        setNuevoAttachmentNombre('')
                        setNuevoAttachmentUrl('')
                      }}
                      aria-label="Editar adjuntos"
                    >
                      <Paperclip className="h-3 w-3" aria-hidden="true" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => void toggleActiva(p.id, p.activa)} aria-label={p.activa ? 'Desactivar recurrente' : 'Activar recurrente'}>
                      {p.activa ? <Pause className="h-3 w-3" aria-hidden="true" /> : <Play className="h-3 w-3" aria-hidden="true" />}
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" aria-label="Eliminar recurrente">
                          <Trash2 className="h-3 w-3" aria-hidden="true" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>¿Eliminar esta plantilla recurrente?</AlertDialogTitle>
                          <AlertDialogDescription>Esta acción no se puede deshacer.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => void eliminar(p.id)}>Eliminar</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardContent>
              </Card>
            )
          }}
        />
      )}

      <p className="text-xs text-muted-foreground text-center">
        Las facturas se generan automáticamente el día que especifiques. Recibirás un email de recordatorio.
      </p>

      <Dialog open={!!editingPlantilla} onOpenChange={(open) => !open && setEditingPlantilla(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Documentos adjuntos</DialogTitle>
            <DialogDescription>
              Gestiona los documentos adjuntos de la plantilla &ldquo;{editingPlantilla?.emisorReceptor}&rdquo;
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {editAttachments.length > 0 ? (
              <div className="space-y-1.5">
                {editAttachments.map((att, i) => (
                  <div key={i} className="flex items-center justify-between rounded-md border px-3 py-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{att.nombre}</p>
                        <p className="text-xs text-muted-foreground truncate">{att.url}</p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0 text-destructive"
                      onClick={() => setEditAttachments(prev => prev.filter((_, j) => j !== i))}
                      aria-label={`Eliminar ${att.nombre}`}
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No hay documentos adjuntos
              </p>
            )}
            <div className="space-y-2">
              <Label>Añadir documento</Label>
              <div className="grid gap-2 sm:grid-cols-[1fr_2fr_auto]">
                <Input
                  value={nuevoAttachmentNombre}
                  onChange={e => setNuevoAttachmentNombre(e.target.value)}
                  placeholder="Nombre"
                />
                <Input
                  value={nuevoAttachmentUrl}
                  onChange={e => setNuevoAttachmentUrl(e.target.value)}
                  placeholder="URL"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!nuevoAttachmentNombre.trim() || !nuevoAttachmentUrl.trim()}
                  onClick={() => {
                    setEditAttachments(prev => [...prev, { nombre: nuevoAttachmentNombre.trim(), url: nuevoAttachmentUrl.trim() }])
                    setNuevoAttachmentNombre('')
                    setNuevoAttachmentUrl('')
                  }}
                >
                  <Plus className="h-3 w-3" aria-hidden="true" />
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingPlantilla(null)}>Cancelar</Button>
            <Button
              onClick={async () => {
                if (!editingPlantilla) return
                const nuevasNotas = serializarNotasConAttachments(editingPlantilla.notas, editAttachments)
                await fetch(`/api/facturas/recurrentes/${editingPlantilla.id}`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ notas: nuevasNotas }),
                })
                setPlantillas(prev => prev.map(p =>
                  p.id === editingPlantilla.id ? { ...p, notas: nuevasNotas } : p
                ))
                setEditingPlantilla(null)
              }}
            >
              Guardar adjuntos
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
