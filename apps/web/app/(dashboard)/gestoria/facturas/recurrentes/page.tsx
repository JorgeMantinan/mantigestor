'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { acquireLock, releaseLock } from '@/lib/recurring-invoice-lock'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ChevronLeft, Plus, Trash2, RefreshCw, FileText } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { generarFacturaClientePDF } from '@/lib/factura-cliente-pdf'
import { DragDropList } from '@/components/drag-drop-list'
import { crearCheckoutRecurring } from '@/lib/stripe-auto-cobro'
import { StripeStatus } from '@/components/stripe-status'
import { useLanguage } from '@/contexts/language-context'
import { PlantillaCard } from '@/components/facturas/plantilla-card'
import { PlantillaFormDialog, type PlantillaFormData } from '@/components/facturas/plantilla-form-dialog'
import { type FacturaRecurrente, type PerfilEmpresa, type Attachment, parseAttachments, serializarNotasConAttachments, serializarNotasData, type NotasData, parseTriggerConfig } from '@/components/facturas/types-recurrentes'
import { usePersonaActiva } from '@/contexts/persona-activa-context'

export default function FacturasRecurrentesPage() {
  const { t } = useLanguage()
  const { perfilActivoId } = usePersonaActiva()
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

  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editPlantilla, setEditPlantilla] = useState<FacturaRecurrente | null>(null)
  const [editGuardando, setEditGuardando] = useState(false)
  const [editError, setEditError] = useState('')

  const [editingPlantilla, setEditingPlantilla] = useState<FacturaRecurrente | null>(null)
  const [editAttachments, setEditAttachments] = useState<Attachment[]>([])
  const [nuevoAttachmentNombre, setNuevoAttachmentNombre] = useState('')
  const [nuevoAttachmentUrl, setNuevoAttachmentUrl] = useState('')

  const [historialOpen, setHistorialOpen] = useState(false)
  const [historialPlantilla, setHistorialPlantilla] = useState<FacturaRecurrente | null>(null)
  const [historialFacturas, setHistorialFacturas] = useState<Array<{ id: string; numero: string; emisorReceptor: string; fechaEmision: string; total: number; estado: string }>>([])
  const [historialLoading, setHistorialLoading] = useState(false)

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
    const perfilBuscado = perfilActivoId ?? user.id

    const [plantillasRes, perfilRes] = await Promise.all([
      getSupabase()
        .from('facturas_recurrentes')
        .select('*')
        .eq('perfilId', perfilBuscado)
        .order('createdAt', { ascending: false }),
      getSupabase()
        .from('perfiles')
        .select('nombre, empresa_nombre, empresa_nif, empresa_direccion, notasPie, logoBase64, firmaBase64, idiomaFactura')
        .eq('id', perfilBuscado)
        .single(),
    ])

    const raw = (plantillasRes.data as FacturaRecurrente[]) ?? []
    const ids = raw.map(p => p.id)
    const orderedIds = loadSavedOrder(ids)
    const ordered = orderedIds.map(id => raw.find(p => p.id === id)).filter(Boolean) as FacturaRecurrente[]
    setPlantillas(ordered)
    if (perfilRes.data) setPerfil(perfilRes.data as PerfilEmpresa)
    setLoading(false)
  }, [getSupabase, perfilActivoId, loadSavedOrder])

  useEffect(() => { fetchPlantillas() }, [fetchPlantillas])

  const handleReorder = useCallback((reordered: FacturaRecurrente[]) => {
    setPlantillas(reordered)
    saveOrder(reordered.map(p => p.id))
  }, [saveOrder])

  const crearPlantilla = async (data: PlantillaFormData) => {
    if (!data.numero || !data.emisorReceptor || !data.baseImponible) {
      setError(t('facturaRecurrente.errorRellenarCampos'))
      return
    }
    if (data.triggerTipo && !data.triggerValor) {
      setError(t('facturaRecurrente.errorTriggerValor'))
      return
    }
    setGuardando(true)
    setError('')
    try {
      const notasData: NotasData = {
        triggerTipo: data.triggerTipo ?? null,
        triggerValor: data.triggerTipo ? parseFloat(data.triggerValor) || null : null,
        attachments: data.attachments.length > 0 ? data.attachments : [],
      }
      const notas = serializarNotasData(notasData)

      const res = await fetch('/api/facturas/recurrentes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo: data.tipo,
          numero: data.numero,
          emisorReceptor: data.emisorReceptor,
          nifContraparte: data.nifContraparte || null,
          baseImponible: parseFloat(data.baseImponible),
          iva: parseInt(data.iva),
          diaGeneracion: parseInt(data.diaGeneracion),
          diaEmail: data.diaEmail ? parseInt(data.diaEmail) : null,
          notas,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        setError(err.error || t('facturaRecurrente.errorCrear'))
        setGuardando(false)
        return
      }
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

    const { error } = await getSupabase().from('facturas').insert({
      id: crypto.randomUUID(),
      perfilId: perfilActivoId ?? user.id,
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

  const abrirEdicion = (p: FacturaRecurrente) => {
    setEditPlantilla(p)
    setEditError('')
    setEditDialogOpen(true)
  }

  const guardarEdicion = async (data: PlantillaFormData) => {
    if (!editPlantilla || !data.numero || !data.emisorReceptor || !data.baseImponible) {
      setEditError(t('facturaRecurrente.errorRellenarCampos'))
      return
    }
    setEditGuardando(true)
    setEditError('')
    try {
      const res = await fetch(`/api/facturas/recurrentes/${editPlantilla.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo: data.tipo,
          numero: data.numero,
          emisorReceptor: data.emisorReceptor,
          nifContraparte: data.nifContraparte || null,
          baseImponible: parseFloat(data.baseImponible),
          iva: parseInt(data.iva),
          diaGeneracion: parseInt(data.diaGeneracion),
          diaEmail: data.diaEmail ? parseInt(data.diaEmail) : null,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        setEditError(err.error || t('facturaRecurrente.errorCrear'))
        setEditGuardando(false)
        return
      }
      setEditDialogOpen(false)
      await fetchPlantillas()
    } catch {
      setEditError(t('facturaRecurrente.errorServidor'))
    }
    setEditGuardando(false)
  }

  const abrirHistorial = async (p: FacturaRecurrente) => {
    setHistorialPlantilla(p)
    setHistorialFacturas([])
    setHistorialOpen(true)
    setHistorialLoading(true)
    try {
      const { data: { user } } = await getSupabase().auth.getUser()
      if (!user) return
      const { data } = await getSupabase()
        .from('facturas')
        .select('id, numero, emisorReceptor, fechaEmision, total, estado')
        .eq('perfilId', perfilActivoId ?? user.id)
        .like('numero', `${p.numero}-%`)
        .order('fechaEmision', { ascending: false })
      setHistorialFacturas((data as Array<{ id: string; numero: string; emisorReceptor: string; fechaEmision: string; total: number; estado: string }>) ?? [])
    } finally {
      setHistorialLoading(false)
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

    const perfilId = perfilActivoId ?? user.id

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
              <svg className="mr-1 h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>
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
        <PlantillaFormDialog
          mode="create"
          open={mostrarForm}
          onOpenChange={setMostrarForm}
          guardando={guardando}
          error={error}
          onGuardar={(data) => void crearPlantilla(data)}
        />
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
          renderItem={(p, _index, dragHandle) => (
            <PlantillaCard
              plantilla={p}
              perfil={perfil}
              dragHandle={dragHandle}
              generandoPdfId={generandoPdfId}
              creandoAhoraId={creandoAhoraId}
              cobrandoId={cobrandoId}
              formatMoney={formatMoney}
              calcularProximaGeneracion={calcularProximaGeneracion}
              onDescargarPdf={(p) => void descargarPdfPlantilla(p)}
              onGenerarAhora={(p) => void generarFacturaAhora(p)}
              onCobrarStripe={(p) => void cobrarConStripe(p)}
              onEditar={abrirEdicion}
              onEditarAdjuntos={(p) => {
                setEditingPlantilla(p)
                setEditAttachments(parseAttachments(p.notas))
                setNuevoAttachmentNombre('')
                setNuevoAttachmentUrl('')
              }}
              onVerHistorial={(p) => void abrirHistorial(p)}
              onToggleActiva={toggleActiva}
              onEliminar={(id) => void eliminar(id)}
            />
          )}
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

      <PlantillaFormDialog
        mode="edit"
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        guardando={editGuardando}
        error={editError}
        onGuardar={(data) => void guardarEdicion(data)}
        editData={editPlantilla}
      />

      <Dialog open={historialOpen} onOpenChange={setHistorialOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('facturaRecurrente.historialTitle')}</DialogTitle>
            <DialogDescription>
              {t('facturaRecurrente.historialDesc').replace('{nombre}', historialPlantilla?.emisorReceptor ?? '')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {historialLoading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            ) : historialFacturas.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                {t('facturaRecurrente.sinHistorial')}
              </p>
            ) : (
              <div className="space-y-1.5">
                {historialFacturas.map(f => (
                  <div key={f.id} className="flex items-center justify-between rounded-md border px-3 py-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{f.numero}</p>
                      <p className="text-xs text-muted-foreground">{f.emisorReceptor} · {new Date(f.fechaEmision).toLocaleDateString('es-ES')}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant={f.estado === 'pagada' ? 'default' : 'secondary'} className="text-xs">{f.estado}</Badge>
                      <span className="text-sm font-medium">{formatMoney(f.total)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setHistorialOpen(false)}>{t('facturaRecurrente.cerrar')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
