'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { ChevronLeft, Plus, Trash2, Pause, Play, RefreshCw } from 'lucide-react'

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
  activa: boolean
  ultimaGeneracion: string | null
  createdAt: string
}

export default function FacturasRecurrentesPage() {
  const [plantillas, setPlantillas] = useState<FacturaRecurrente[]>([])
  const [loading, setLoading] = useState(true)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  // Form state
  const [tipo, setTipo] = useState('gasto')
  const [numero, setNumero] = useState('')
  const [emisorReceptor, setEmisorReceptor] = useState('')
  const [nifContraparte, setNifContraparte] = useState('')
  const [baseImponible, setBaseImponible] = useState('')
  const [iva, setIva] = useState('21')
  const [diaGeneracion, setDiaGeneracion] = useState('5')

  const getSupabase = useCallback(() => createClient(), [])

  const fetchPlantillas = useCallback(async () => {
    const { data: { user } } = await getSupabase().auth.getUser()
    if (!user) { setLoading(false); return }
    const { data } = await getSupabase()
      .from('facturas_recurrentes')
      .select('*')
      .eq('perfilId', user.id)
      .order('createdAt', { ascending: false })
    setPlantillas((data as FacturaRecurrente[]) ?? [])
    setLoading(false)
  }, [getSupabase])

  useEffect(() => { fetchPlantillas() }, [fetchPlantillas])

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
    if (!confirm('¿Eliminar esta plantilla recurrente?')) return
    await fetch(`/api/facturas/recurrentes/${id}`, { method: 'DELETE' })
    setPlantillas(prev => prev.filter(p => p.id !== id))
  }

  const formatMoney = (cents: number) =>
    new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(cents / 100)

  const nombreMes = (dia: number) => `Día ${dia} de cada mes`

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/gestoria/facturas">
            <Button variant="ghost" size="icon">
              <ChevronLeft className="h-4 w-4" />
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
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
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
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  {TIPOS_IVA.map(t => <option key={t} value={t}>{t}%</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Día del mes</Label>
                <select value={diaGeneracion} onChange={e => setDiaGeneracion(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  {Array.from({ length: 28 }, (_, i) => i + 1).map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
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
        <div className="space-y-3">
          {plantillas.map(p => (
            <Card key={p.id} className={!p.activa ? 'opacity-60' : ''}>
              <CardContent className="flex items-center justify-between py-4">
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
                    <span>·</span>
                    <span className="capitalize">{p.tipo === 'ingreso' ? 'Ingreso' : 'Gasto'}</span>
                  </div>
                  {p.ultimaGeneracion && (
                    <p className="text-xs text-muted-foreground">
                      Última generación: {new Date(p.ultimaGeneracion).toLocaleDateString('es-ES')}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{formatMoney(p.baseImponible)}</span>
                  <span className="text-xs text-muted-foreground">+{p.iva}%</span>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => void toggleActiva(p.id, p.activa)}>
                    {p.activa ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => void eliminar(p.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <p className="text-xs text-muted-foreground text-center">
        Las facturas se generan automáticamente el día que especifiques. Recibirás un email de recordatorio.
      </p>
    </div>
  )
}
