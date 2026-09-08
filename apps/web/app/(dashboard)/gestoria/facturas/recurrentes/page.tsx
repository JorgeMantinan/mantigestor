'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { acquireLock, releaseLock } from '@/lib/recurring-invoice-lock'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ChevronLeft, Plus, Trash2, Pause, Play, RefreshCw, Download, FileText, Zap, CircleDollarSign, CalendarDays, Wallet, Paperclip, Link as LinkIcon, CreditCard } from 'lucide-react'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { VistaPreviaPlantilla } from '@/components/vista-previa-plantilla'
import { generarFacturaClientePDF } from '@/lib/factura-cliente-pdf'
import { DragDropList } from '@/components/drag-drop-list'
import { crearCheckoutRecurring } from '@/lib/stripe-auto-cobro'
import { StripeStatus } from '@/components/stripe-status'
import { useLanguage } from '@/contexts/language-context'

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
  idiomaFactura: string | null
}

export default function FacturasRecurrentesPage() {
  const { t } = useLanguage()
  const [plantillas, setPlantillas] = useState<FacturaRecurrente[]>([])
  const [loading, setLoading] = useState(true)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const [perfil, setPerfil] = useState<PerfilEmpresa | null>(null)
  const [generandoPdfId, setGenerandoPdfId] = useState<string | null>(null)
  const [creandoAhoraId, setCreandoAhoraId] = useState<string | null>(null)
  const [cobrandoId, setCobrandoId] = useState<string | null>(null)
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
        .select('nombre, empresa_nombre, empresa_nif, empresa_direccion, notasPie, logoBase64, firmaBase64, idiomaFactura')
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
      setError(t('facturaRecurrente.errorRellenarCampos'))
      return
    }
    if (triggerTipo && !triggerValor) {
      setError(t('facturaRecurrente.errorTriggerValor'))
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
        setError(err.error || t('facturaRecurrente.errorCrear'))
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
      setError(t('facturaRecurrente.errorServidor'))
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
        idioma: (perfil?.idiomaFactura as 'es' | 'en') ?? 'es',
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

  const cobrarConStripe = async (plantilla: FacturaRecurrente) => {
    setCobrandoId(plantilla.id)
    try {
      const importeIva = Math.round(plantilla.baseImponible * (plantilla.iva / 100))
      const total = plantilla.baseImponible + importeIva

      const { data: { user } } = await getSupabase().auth.getUser()
      if (!user?.email) return

      const ahora = new Date()
      const numeroSiguiente = `${plantilla.numero}-${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, '0')}`
      const descripcion = `Factura ${numeroSiguiente} - ${plantilla.emisorReceptor}`

      const url = await crearCheckoutRecurring(plantilla.id, user.email, total / 100, descripcion)
      if (url) {
        window.open(url, '_blank')
      }
    } finally {
      setCobrandoId(null)
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

    const perfilId = perfil.id as string

    if (!acquireLock(perfilId)) {
      setBatchResult({ generadas: 0, omitidas: 0 })
      setTimeout(() => setBatchResult(null), 4000)
      return
    }

    try {
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
            .eq('perfilId', perfilId)
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
            .eq('perfilId', perfilId)
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
          .eq('perfilId', perfilId)
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
          perfilId,
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
    } finally {
      releaseLock(perfilId)
    }
  }

  const formatMoney = (cents: number) =>
    new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(cents / 100)

  const nombreMes = (dia: number) => t('facturaRecurrente.diaDeCadaMes').replace('{dia}', String(dia))

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
            <h1 className="text-2xl font-heading font-bold tracking-tight">{t('facturaRecurrente.titulo')}</h1>
            <p className="text-sm text-muted-foreground">
              {t('facturaRecurrente.subtitulo')}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <StripeStatus />
          <Button size="sm" onClick={() => setMostrarForm(!mostrarForm)}>
            <Plus className="mr-1 h-3 w-3" />
            {t('facturaRecurrente.nuevaRecurrente')}
          </Button>
        </div>
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
              ? t('facturaRecurrente.generando').replace('{actual}', String(batchProgress.actual)).replace('{total}', String(batchProgress.total))
              : t('facturaRecurrente.generarTodasPendientes')}
          </Button>
          {batchResult && (
            <span className="text-sm text-muted-foreground">
              {batchResult.generadas > 0 && `${batchResult.generadas} ${t('facturaRecurrente.generadas')}`}
              {batchResult.generadas > 0 && batchResult.omitidas > 0 && ', '}
              {batchResult.omitidas > 0 && `${batchResult.omitidas} ${t('facturaRecurrente.omitidas')}`}
              {batchResult.generadas === 0 && batchResult.omitidas === 0 && t('facturaRecurrente.noHayPendientes')}
            </span>
          )}
        </div>
      )}

      {mostrarForm && (
        <Card>
          <CardHeader>
            <CardTitle>{t('facturaRecurrente.nuevaFacturaRecurrente')}</CardTitle>
            <CardDescription>
              {t('facturaRecurrente.descripcionForm')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>{t('facturaRecurrente.tipo')}</Label>
                <select value={tipo} onChange={e => setTipo(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                  <option value="ingreso">{t('facturaRecurrente.tipoIngreso')}</option>
                  <option value="gasto">{t('facturaRecurrente.tipoGasto')}</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>{t('facturaRecurrente.numeroFacturaPrefijo')}</Label>
                <Input value={numero} onChange={e => setNumero(e.target.value)} placeholder="F-2024-" />
                <p className="text-xs text-muted-foreground">{t('facturaRecurrente.anadirAutomaticamente')}</p>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>{t('facturaRecurrente.nombreProveedor')}</Label>
                <Input value={emisorReceptor} onChange={e => setEmisorReceptor(e.target.value)} placeholder="Empresa XYZ" />
              </div>
              <div className="space-y-2">
                <Label>{t('facturaRecurrente.nifCif')}</Label>
                <Input value={nifContraparte} onChange={e => setNifContraparte(e.target.value)} placeholder="B12345678" />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label>{t('facturaRecurrente.baseImponible')}</Label>
                <Input type="number" step="0.01" value={baseImponible} onChange={e => setBaseImponible(e.target.value)} placeholder="100.00" />
              </div>
              <div className="space-y-2">
                <Label>{t('facturaRecurrente.ivaPorcentaje')}</Label>
                <select value={iva} onChange={e => setIva(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                  {TIPOS_IVA.map(t => <option key={t} value={t}>{t}%</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <Label>{t('facturaRecurrente.diaDelMes')}</Label>
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
                <Label>{t('facturaRecurrente.diaAvisoEmail')}</Label>
                <select value={diaEmail} onChange={e => setDiaEmail(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                  <option value="">{t('facturaRecurrente.sinAviso')}</option>
                  {Array.from({ length: 28 }, (_, i) => i + 1).map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground">{t('facturaRecurrente.emailAutomatico')}</p>
              </div>
            </div>
            <div className="space-y-3 rounded-md border p-4">
              <Label className="text-sm font-medium">{t('facturaRecurrente.triggerGeneracion')}</Label>
              <p className="text-xs text-muted-foreground">
                {t('facturaRecurrente.triggerDescripcion')}
              </p>
              <div className="space-y-2">
                {([
                  { value: null, label: t('facturaRecurrente.triggerPorDia'), icon: CalendarDays, desc: t('facturaRecurrente.triggerDescDia').replace('{dia}', String(diaGeneracion)) },
                  { value: 'umbral_gasto' as TriggerTipo, label: t('facturaRecurrente.triggerUmbralGasto'), icon: CircleDollarSign, desc: t('facturaRecurrente.triggerDescUmbral') },
                  { value: 'fecha_especifica' as TriggerTipo, label: t('facturaRecurrente.triggerFechaEspecifica'), icon: CalendarDays, desc: t('facturaRecurrente.triggerDescDia').replace('{dia}', String(diaGeneracion)) },
                  { value: 'saldo_bajo' as TriggerTipo, label: t('facturaRecurrente.triggerSaldoBajo'), icon: Wallet, desc: t('facturaRecurrente.triggerDescSaldo') },
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
                    <Label>{triggerTipo === 'fecha_especifica' ? t('facturaRecurrente.diaDelMes') : t('facturaRecurrente.umbralEuros')}</Label>
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
                      {triggerTipo === 'umbral_gasto' && t('facturaRecurrente.fechaGeneracion')}
                      {triggerTipo === 'fecha_especifica' && t('facturaRecurrente.fechaEspecificaDesc')}
                      {triggerTipo === 'saldo_bajo' && t('facturaRecurrente.saldoBajoDesc')}
                    </p>
                  </div>
                  {triggerTipo === 'saldo_bajo' && (
                    <div className="space-y-2">
                      <Label>{t('facturaRecurrente.saldoActualBanco')} <span className="text-muted-foreground text-xs">{t('facturaRecurrente.manual')}</span></Label>
                      <Input type="number" step="0.01" value={saldoBanco} onChange={e => setSaldoBanco(e.target.value)} placeholder="0.00" />
                      <p className="text-xs text-muted-foreground">{t('facturaRecurrente.introduceSaldo')}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="space-y-3 rounded-md border p-4">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Paperclip className="h-3.5 w-3.5" aria-hidden="true" />
                {t('facturaRecurrente.documentosAdjuntos')}
              </Label>
              <p className="text-xs text-muted-foreground">
                {t('facturaRecurrente.documentosAdjuntosDesc')}
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
                  placeholder={t('facturaRecurrente.nombreDocumento')}
                />
                <Input
                  value={nuevoAttachmentUrl}
                  onChange={e => setNuevoAttachmentUrl(e.target.value)}
                  placeholder={t('facturaRecurrente.urlDocumento')}
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
              <Button variant="outline" onClick={() => setMostrarForm(false)}>{t('facturaRecurrente.cancelar')}</Button>
              <Button onClick={() => void crearPlantilla()} disabled={guardando}>
                {guardando ? t('facturaRecurrente.guardando') : t('facturaRecurrente.crearPlantilla')}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <RefreshCw className="mx-auto mb-2 h-4 w-4 animate-spin" />
            {t('facturaRecurrente.cargandoPlantillas')}
          </CardContent>
        </Card>
      ) : plantillas.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="font-medium">{t('facturaRecurrente.noHayRecurrentes')}</p>
            <p className="text-sm text-muted-foreground mt-1">
              {t('facturaRecurrente.creaPlantilla')}
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
                              return <span className="inline-flex items-center gap-1 text-amber-600"><CircleDollarSign className="h-3 w-3" /> {t('facturaRecurrente.gasto')} &gt; {formatMoney(triggerValor * 100)}</span>
                            }
                            if (triggerTipo === 'saldo_bajo' && triggerValor != null) {
                              return <span className="inline-flex items-center gap-1 text-orange-600"><Wallet className="h-3 w-3" /> {t('facturaRecurrente.saldo')} &lt; {formatMoney(triggerValor * 100)}</span>
                            }
                            return <span>{nombreMes(p.diaGeneracion)}</span>
                          })()}
                          {p.diaEmail && (
                            <>
                              <span>·</span>
                              <span className="text-blue-600">{t('facturaRecurrente.emailDia').replace('{dia}', String(p.diaEmail))}</span>
                            </>
                          )}
                          <span>·</span>
                          <span className="capitalize">{p.tipo === 'ingreso' ? t('facturaRecurrente.ingreso') : t('facturaRecurrente.gasto')}</span>
                        </div>
                        {p.ultimaGeneracion && (
                          <p className="text-xs text-muted-foreground">
                            {t('facturaRecurrente.ultimaGeneracion')}: {new Date(p.ultimaGeneracion).toLocaleDateString('es-ES')}
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
                            {t('facturaRecurrente.proximaGeneracion')}: {calcularProximaGeneracion(p.diaGeneracion).toLocaleDateString('es-ES')}
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
                      {t('facturaRecurrente.descargarPdf')}
                    </Button>

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm" className="h-7 text-xs" disabled={!p.activa || creandoAhoraId === p.id}>
                          {creandoAhoraId === p.id ? (
                            <RefreshCw className="mr-1 h-3 w-3 animate-spin" />
                          ) : (
                            <FileText className="mr-1 h-3 w-3" />
                          )}
                          {t('facturaRecurrente.generarAhora')}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>{t('facturaRecurrente.generarFacturaAhora')}</AlertDialogTitle>
                          <AlertDialogDescription>
                            {t('facturaRecurrente.generarFacturaAhoraDesc').replace('{numero}', numeroSiguiente).replace('{fecha}', ahora.toLocaleDateString('es-ES')).replace('{total}', formatMoney(total)).replace('{iva}', String(p.iva))}
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>{t('facturaRecurrente.cancelar')}</AlertDialogCancel>
                          <AlertDialogAction onClick={() => void generarFacturaAhora(p)}>
                            {t('facturaRecurrente.confirmarGeneracion')}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>

                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      disabled={!p.activa || cobrandoId === p.id || p.tipo !== 'ingreso'}
                      onClick={() => void cobrarConStripe(p)}
                      title={p.tipo !== 'ingreso' ? t('facturaRecurrente.soloIngreso') : t('facturaRecurrente.cobrarConStripe')}
                    >
                      {cobrandoId === p.id ? (
                        <RefreshCw className="mr-1 h-3 w-3 animate-spin" />
                      ) : (
                        <CreditCard className="mr-1 h-3 w-3" />
                      )}
                      {t('facturaRecurrente.cobrarConStripe')}
                    </Button>

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
                      aria-label={t('facturaRecurrente.editarAdjuntos')}
                    >
                      <Paperclip className="h-3 w-3" aria-hidden="true" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => void toggleActiva(p.id, p.activa)} aria-label={p.activa ? t('facturaRecurrente.desactivarRecurrente') : t('facturaRecurrente.activarRecurrente')}>
                      {p.activa ? <Pause className="h-3 w-3" aria-hidden="true" /> : <Play className="h-3 w-3" aria-hidden="true" />}
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" aria-label={t('facturaRecurrente.eliminarRecurrente')}>
                          <Trash2 className="h-3 w-3" aria-hidden="true" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>{t('facturaRecurrente.eliminarPlantillaTitle')}</AlertDialogTitle>
                          <AlertDialogDescription>{t('facturaRecurrente.eliminarPlantillaDesc')}</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>{t('facturaRecurrente.cancelar')}</AlertDialogCancel>
                          <AlertDialogAction onClick={() => void eliminar(p.id)}>{t('facturaRecurrente.eliminar')}</AlertDialogAction>
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
        {t('facturaRecurrente.facturasGeneranAuto')}
      </p>

      <Dialog open={!!editingPlantilla} onOpenChange={(open) => !open && setEditingPlantilla(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('facturaRecurrente.documentosAdjuntosTitle')}</DialogTitle>
            <DialogDescription>
              {t('facturaRecurrente.documentosAdjuntosGestionar').replace('{nombre}', editingPlantilla?.emisorReceptor ?? '')}
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
                {t('facturaRecurrente.noHayAdjuntos')}
              </p>
            )}
            <div className="space-y-2">
              <Label>{t('facturaRecurrente.anadirDocumento')}</Label>
              <div className="grid gap-2 sm:grid-cols-[1fr_2fr_auto]">
                <Input
                  value={nuevoAttachmentNombre}
                  onChange={e => setNuevoAttachmentNombre(e.target.value)}
                  placeholder={t('facturaRecurrente.nombre')}
                />
                <Input
                  value={nuevoAttachmentUrl}
                  onChange={e => setNuevoAttachmentUrl(e.target.value)}
                  placeholder={t('facturaRecurrente.url')}
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
            <Button variant="outline" onClick={() => setEditingPlantilla(null)}>{t('facturaRecurrente.cancelar')}</Button>
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
              {t('facturaRecurrente.guardarAdjuntos')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
