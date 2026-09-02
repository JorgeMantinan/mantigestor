'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { ChevronLeft, Plus, Trash2, Pause, Play, RefreshCw, Download, FileText, Zap } from 'lucide-react'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { VistaPreviaPlantilla } from '@/components/vista-previa-plantilla'
import { generarFacturaClientePDF } from '@/lib/factura-cliente-pdf'
import { DragDropList } from '@/components/drag-drop-list'

const TIPOS_IVA = [21, 10, 4, 0] as const

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
}

interface PerfilEmpresa {
  nombre: string | null
  empresa_nombre: string | null
  empresa_nif: string | null
  empresa_direccion: string | null
  notasPie: string | null
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
        .select('nombre, empresa_nombre, empresa_nif, empresa_direccion, notasPie')
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
    setGuardando(true)
    setError('')
    try {
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
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        setError(err.error || 'Error al crear')
        setGuardando(false)
        return
      }
      // Reset form
      setNumero('')
      setEmisorReceptor('')
      setNifContraparte('')
      setBaseImponible('')
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
                          <span>{nombreMes(p.diaGeneracion)}</span>
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
    </div>
  )
}
