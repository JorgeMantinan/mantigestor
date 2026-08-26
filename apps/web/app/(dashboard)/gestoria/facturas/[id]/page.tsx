'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { ChevronLeft, Pencil, Trash2, Mic, MicOff, Loader2 } from 'lucide-react'
import { useSpeechRecognition } from '@/hooks/use-speech-recognition'
import type { OcrResult } from '@/lib/ocr'

interface Factura {
  id: string
  numero: string
  tipo: string
  emisorReceptor: string
  nifContraparte: string | null
  fechaEmision: string
  fechaVencimiento: string | null
  baseImponible: number
  iva: number
  total: number
  estado: string
}

export default function FacturaDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [factura, setFactura] = useState<Factura | null>(null)
  const [editing, setEditing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [parseandoVoz, setParseandoVoz] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)
  const speech = useSpeechRecognition()

  const getSupabase = useCallback(() => createClient(), [])

  useEffect(() => {
    const fetchFactura = async () => {
      const { data: { user } } = await getSupabase().auth.getUser()
      if (!user) return
      const { data } = await getSupabase()
        .from('facturas')
        .select('*')
        .eq('id', params.id)
        .eq('perfilId', user.id)
        .single()
      if (data) setFactura(data as Factura)
      setLoading(false)
    }
    fetchFactura()
  }, [params.id, getSupabase])

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!factura) return
    setSaving(true)

    const form = new FormData(e.currentTarget)
    const baseImponible = parseFloat(form.get('baseImponible') as string) * 100
    const iva = parseInt(form.get('iva') as string, 10)
    const importeIva = Math.round(baseImponible * (iva / 100))
    const total = baseImponible + importeIva

    const { error } = await getSupabase().from('facturas').update({
      numero: form.get('numero') as string,
      tipo: form.get('tipo') as string,
      emisorReceptor: form.get('emisorReceptor') as string,
      nifContraparte: form.get('nifContraparte') as string,
      fechaEmision: form.get('fechaEmision') as string,
      fechaVencimiento: form.get('fechaVencimiento') as string || null,
      baseImponible,
      iva,
      total,
    }).eq('id', factura.id)

    if (!error) {
      setFactura({ ...factura, ...Object.fromEntries(form) } as unknown as Factura)
      setEditing(false)
    }
    setSaving(false)
  }

  const handleDelete = async () => {
    if (!factura || !confirm('¿Eliminar esta factura definitivamente?')) return
    await getSupabase().from('facturas').delete().eq('id', factura.id)
    router.push('/gestoria/facturas')
  }

  async function parsearVoz() {
    const texto = speech.transcripcion.trim()
    if (!texto) return
    setParseandoVoz(true)
    try {
      const res = await fetch('/api/facturas/parsear-voz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texto }),
      })
      if (!res.ok) {
        const err = await res.json()
        alert(err.error || 'Error al procesar el audio')
        setParseandoVoz(false)
        return
      }
      const data: OcrResult = await res.json()
      if (!formRef.current) { setParseandoVoz(false); return }
      const f = formRef.current
      if (data.tipo) (f.elements.namedItem('tipo') as HTMLSelectElement).value = data.tipo
      if (data.numero) (f.elements.namedItem('numero') as HTMLInputElement).value = data.numero
      if (data.emisorReceptor) (f.elements.namedItem('emisorReceptor') as HTMLInputElement).value = data.emisorReceptor
      if (data.nifContraparte) (f.elements.namedItem('nifContraparte') as HTMLInputElement).value = data.nifContraparte
      if (data.fechaEmision) (f.elements.namedItem('fechaEmision') as HTMLInputElement).value = data.fechaEmision
      if (data.baseImponible !== null) (f.elements.namedItem('baseImponible') as HTMLInputElement).value = data.baseImponible.toString()
      if (data.iva !== null) (f.elements.namedItem('iva') as HTMLSelectElement).value = data.iva.toString()
      speech.limpiar()
    } catch {
      alert('Error al conectar con el servicio de IA')
    }
    setParseandoVoz(false)
  }

  const formatMoney = (cents: number) =>
    new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(cents / 100)

  if (loading) return <div className="text-center text-muted-foreground py-12">Cargando...</div>
  if (!factura) return <div className="text-center text-muted-foreground py-12">Factura no encontrada</div>

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/gestoria/facturas">
            <Button variant="ghost" size="icon">
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-heading font-bold tracking-tight">
              Factura {factura.numero}
            </h1>
            <p className="text-sm text-muted-foreground">
              {factura.tipo === 'ingreso' ? 'Emitida' : 'Recibida'} —{' '}
              {new Date(factura.fechaEmision).toLocaleDateString('es-ES')}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setEditing(!editing)}>
            <Pencil className="mr-2 h-4 w-4" />
            Editar
          </Button>
          <Button variant="destructive" size="sm" onClick={handleDelete}>
            <Trash2 className="mr-2 h-4 w-4" />
            Eliminar
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            {editing ? 'Editar factura' : 'Detalle de la factura'}
          </CardTitle>
          <CardDescription>
            {editing ? 'Modifica los campos necesarios' : 'Información completa de la factura'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {editing ? (
            <form ref={formRef} onSubmit={handleSave} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="tipo">Tipo</Label>
                  <select
                    id="tipo"
                    name="tipo"
                    defaultValue={factura.tipo}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <option value="ingreso">Ingreso (emitida)</option>
                    <option value="gasto">Gasto (recibida)</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="numero">Nº factura</Label>
                  <Input id="numero" name="numero" defaultValue={factura.numero} required />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="emisorReceptor">Contraparte</Label>
                  <Input id="emisorReceptor" name="emisorReceptor" defaultValue={factura.emisorReceptor} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nifContraparte">NIF/CIF</Label>
                  <Input id="nifContraparte" name="nifContraparte" defaultValue={factura.nifContraparte ?? ''} />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="fechaEmision">Fecha emisión</Label>
                  <Input id="fechaEmision" name="fechaEmision" type="date" defaultValue={factura.fechaEmision?.split('T')[0]} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fechaVencimiento">Fecha vencimiento</Label>
                  <Input id="fechaVencimiento" name="fechaVencimiento" type="date" defaultValue={factura.fechaVencimiento?.split('T')[0] ?? ''} />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="baseImponible">Base imponible (€)</Label>
                  <Input id="baseImponible" name="baseImponible" type="number" step="0.01" defaultValue={(factura.baseImponible / 100).toFixed(2)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="iva">IVA (%)</Label>
                  <select
                    id="iva"
                    name="iva"
                    defaultValue={factura.iva}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    {[21, 10, 4, 0].map((t) => (
                      <option key={t} value={t}>{t}%</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="total">Total (€)</Label>
                  <Input id="total" disabled value={(factura.total / 100).toFixed(2)} />
                </div>
              </div>
              <div className="flex gap-4 pt-4">
                <Button variant="outline" type="button" onClick={() => setEditing(false)} className="flex-1">
                  Cancelar
                </Button>
                <Button type="submit" disabled={saving} className="flex-1">
                  {saving ? 'Guardando...' : 'Guardar cambios'}
                </Button>
              </div>

              {speech.soportado && (
                <div className="rounded-md border p-3 space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">Entrada por voz</p>
                  <div className="flex gap-2">
                    {!speech.escuchando ? (
                      <Button type="button" variant="outline" size="sm" onClick={speech.iniciar}>
                        <Mic className="mr-1 h-3 w-3" aria-hidden="true" />
                        Hablar
                      </Button>
                    ) : (
                      <Button type="button" variant="destructive" size="sm" onClick={speech.parar}>
                        <MicOff className="mr-1 h-3 w-3" aria-hidden="true" />
                        Detener
                      </Button>
                    )}
                    {speech.transcripcion && (
                      <Button type="button" variant="ghost" size="sm" onClick={speech.limpiar}>
                        Borrar
                      </Button>
                    )}
                  </div>
                  {speech.escuchando && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" />
                      Escuchando...
                    </div>
                  )}
                  {(speech.transcripcion || speech.transcripcionInterina) && (
                    <div className="rounded bg-muted/50 p-2 text-xs">
                      {speech.transcripcion}
                      {speech.transcripcionInterina && (
                        <span className="text-muted-foreground">{speech.transcripcionInterina}</span>
                      )}
                    </div>
                  )}
                  {speech.transcripcion && (
                    <Button type="button" size="sm" variant="secondary" onClick={() => void parsearVoz()} disabled={parseandoVoz}>
                      {parseandoVoz ? <Loader2 className="mr-1 h-3 w-3 animate-spin" aria-hidden="true" /> : <Mic className="mr-1 h-3 w-3" aria-hidden="true" />}
                      {parseandoVoz ? 'Procesando...' : 'Auto-rellenar'}
                    </Button>
                  )}
                </div>
              )}
            </form>
          ) : (
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-muted-foreground">Nº factura</dt>
                <dd className="font-medium">{factura.numero}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Tipo</dt>
                <dd className="font-medium capitalize">{factura.tipo === 'ingreso' ? 'Emitida' : 'Recibida'}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Contraparte</dt>
                <dd className="font-medium">{factura.emisorReceptor}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">NIF/CIF</dt>
                <dd className="font-medium">{factura.nifContraparte ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Fecha emisión</dt>
                <dd className="font-medium">{new Date(factura.fechaEmision).toLocaleDateString('es-ES')}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Fecha vencimiento</dt>
                <dd className="font-medium">{factura.fechaVencimiento ? new Date(factura.fechaVencimiento).toLocaleDateString('es-ES') : '—'}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Base imponible</dt>
                <dd className="font-medium">{formatMoney(factura.baseImponible)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">IVA</dt>
                <dd className="font-medium">{factura.iva}%</dd>
              </div>
              <div className="col-span-2 border-t pt-2">
                <dt className="text-muted-foreground">Total</dt>
                <dd className="text-xl font-bold">{formatMoney(factura.total)}</dd>
              </div>
              <div className="col-span-2">
                <dt className="text-muted-foreground">Estado</dt>
                <dd>
                  <span className="inline-block rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700 dark:bg-green-900 dark:text-green-300">
                    {factura.estado}
                  </span>
                </dd>
              </div>
            </dl>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
