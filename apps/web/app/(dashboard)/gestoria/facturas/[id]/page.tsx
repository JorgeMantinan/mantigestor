'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { ChevronLeft, Pencil, Trash2, Download, Mail } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { enviarFacturaPorEmail } from '@/lib/factura-email'
import { useSpeechRecognition } from '@/hooks/use-speech-recognition'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { useParsearVoz } from '@/hooks/use-parsear-voz'
import { VoiceInput } from '@/components/facturas/voice-input'
import { logAccion } from '@/lib/audit-log'
import { CategoriaGastoPicker } from '@/components/facturas/categoria-gasto-picker'
import { generarFacturaClientePDF, NOMBRES_PLANTILLAS, type PlantillaFactura } from '@/lib/factura-cliente-pdf'
import { VistaPreviaPlantilla } from '@/components/vista-previa-plantilla'
import { TimelineFactura } from '@/components/timeline-factura'
import { MOEDAS, formatoMoneda, obtenerTasaCambio } from '@/lib/divisas'
import { TAGS_PREDEFINIDOS, obtenerColorTag, parsearTags, serializarTags, obtenerNombreTag } from '@/lib/tags'

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
  categoriaGasto: string | null
  tags?: string | null
  moneda?: string
  tipoCambio?: number
}

export default function FacturaDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [factura, setFactura] = useState<Factura | null>(null)
  const [editing, setEditing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [categoriaGasto, setCategoriaGasto] = useState<string | null>(null)
  const [notas, setNotas] = useState<string>('')
  const [tagsSeleccionados, setTagsSeleccionados] = useState<string[]>([])
  const [nuevoTagCustom, setNuevoTagCustom] = useState('')
  const [mostrarTagsDropdown, setMostrarTagsDropdown] = useState(false)
  const [perfil, setPerfil] = useState<{ nombre: string | null; empresa_nombre: string | null; empresa_nif: string | null; empresa_direccion: string | null } | null>(null)
  const [emailDialogOpen, setEmailDialogOpen] = useState(false)
  const [emailDestino, setEmailDestino] = useState('')
  const [enviandoEmail, setEnviandoEmail] = useState(false)
  const [plantilla, setPlantilla] = useState<PlantillaFactura>('clasico')
  const [monedaEdit, setMonedaEdit] = useState('EUR')
  const [tipoCambioEdit, setTipoCambioEdit] = useState(1)
  const [cargandoTasaEdit, setCargandoTasaEdit] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)
  const tagsDropdownRef = useRef<HTMLDivElement>(null)
  const speech = useSpeechRecognition()
  const { parseandoVoz, parsearVoz } = useParsearVoz({ formRef })

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
      if (data) {
        setFactura(data as Factura)
        setCategoriaGasto((data as Factura).categoriaGasto ?? null)
        setNotas((data as unknown as { notas: string | null }).notas ?? '')
        setTagsSeleccionados(parsearTags((data as unknown as { tags: string | null }).tags))
        setMonedaEdit((data as Factura).moneda ?? 'EUR')
        setTipoCambioEdit((data as Factura).tipoCambio ?? 1)
      }
      const { data: perfilData } = await getSupabase()
        .from('perfiles')
        .select('nombre, empresa_nombre, empresa_nif, empresa_direccion')
        .eq('id', user.id)
        .single()
      if (perfilData) setPerfil(perfilData)
      setLoading(false)
    }
    fetchFactura()
  }, [params.id, getSupabase])

  useEffect(() => {
    if (!mostrarTagsDropdown) return
    const handleClickOutside = (e: MouseEvent) => {
      if (tagsDropdownRef.current && !tagsDropdownRef.current.contains(e.target as Node)) {
        setMostrarTagsDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [mostrarTagsDropdown])

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
      categoriaGasto: form.get('tipo') === 'gasto' ? (form.get('categoriaGasto') as string || null) : null,
      notas: notas || null,
      tags: serializarTags(tagsSeleccionados) || null,
      moneda: monedaEdit,
      tipoCambio: tipoCambioEdit,
    }).eq('id', factura.id)

    if (!error) {
      setFactura({ ...factura, ...Object.fromEntries(form), moneda: monedaEdit, tipoCambio: tipoCambioEdit } as unknown as Factura)
      setEditing(false)
    }
    setSaving(false)
  }

  const handleDelete = async () => {
    if (!factura) return
    await getSupabase().from('facturas').delete().eq('id', factura.id)
    await logAccion('eliminar', 'factura', factura.id, `Factura ${factura.numero} eliminada`)
    router.push('/gestoria/facturas')
  }

  const handleEnviarEmail = async () => {
    if (!factura || !emailDestino) return
    setEnviandoEmail(true)
    try {
      const result = await enviarFacturaPorEmail(
        factura.id,
        emailDestino,
        {
          numero: factura.numero,
          emisorReceptor: factura.emisorReceptor,
          nifContraparte: factura.nifContraparte,
          fechaEmision: factura.fechaEmision,
          baseImponible: factura.baseImponible,
          iva: factura.iva,
          total: factura.total,
          tipo: factura.tipo,
          empresaNombre: perfil?.empresa_nombre ?? perfil?.nombre ?? undefined,
          empresaDireccion: perfil?.empresa_direccion ?? undefined,
          empresaNif: perfil?.empresa_nif ?? undefined,
          notas: notas || null,
        },
        plantilla
      )
      if (result.ok) {
        toast.success(result.skipped ? 'Email no enviado (sin API key configurada)' : `Email enviado a ${emailDestino}`)
        setEmailDialogOpen(false)
      } else {
        toast.error(result.error || 'Error al enviar el email')
      }
    } catch {
      toast.error('Error al enviar el email')
    }
    setEnviandoEmail(false)
  }

  function handleParsearVoz() {
    void parsearVoz(speech.transcripcion)
    speech.limpiar()
  }

  const formatMoney = (cents: number) =>
    formatoMoneda(cents / 100, factura?.moneda ?? 'EUR')

  if (loading) return <div className="text-center text-muted-foreground py-12">Cargando...</div>
  if (!factura) return <div className="text-center text-muted-foreground py-12">Factura no encontrada</div>

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/gestoria/facturas">
            <Button variant="ghost" size="icon" aria-label="Volver a facturas">
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
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
          <VistaPreviaPlantilla datos={{
            numero: factura.numero,
            emisorReceptor: factura.emisorReceptor,
            nifContraparte: factura.nifContraparte,
            fechaEmision: factura.fechaEmision,
            baseImponible: factura.baseImponible,
            iva: factura.iva,
            total: factura.total,
            tipo: factura.tipo,
            empresaNombre: perfil?.empresa_nombre ?? perfil?.nombre ?? undefined,
            empresaDireccion: perfil?.empresa_direccion ?? undefined,
            empresaNif: perfil?.empresa_nif ?? undefined,
          }} />
          <select value={plantilla} onChange={(e) => setPlantilla(e.target.value as PlantillaFactura)} className="h-8 rounded border border-input bg-background px-2 text-xs">
            {(Object.entries(NOMBRES_PLANTILLAS) as Array<[PlantillaFactura, string]>).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          <Button variant="outline" size="sm" onClick={() => {
            const looksLikeEmail = /@.*\./.test(factura.emisorReceptor)
            setEmailDestino(looksLikeEmail ? factura.emisorReceptor : '')
            setEmailDialogOpen(true)
          }}>
            <Mail className="mr-2 h-4 w-4" />
            Enviar por email
          </Button>
          <Button variant="outline" size="sm" onClick={() => void generarFacturaClientePDF({
            numero: factura.numero,
            emisorReceptor: factura.emisorReceptor,
            nifContraparte: factura.nifContraparte,
            fechaEmision: factura.fechaEmision,
            baseImponible: factura.baseImponible,
            iva: factura.iva,
            total: factura.total,
            tipo: factura.tipo,
            empresaNombre: perfil?.empresa_nombre ?? perfil?.nombre ?? undefined,
            empresaDireccion: perfil?.empresa_direccion ?? undefined,
            empresaNif: perfil?.empresa_nif ?? undefined,
          }, plantilla)}>
            <Download className="mr-2 h-4 w-4" />
            Descargar PDF
          </Button>
          <Button variant="outline" size="sm" onClick={() => setEditing(!editing)}>
            <Pencil className="mr-2 h-4 w-4" />
            Editar
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm">
                <Trash2 className="mr-2 h-4 w-4" />
                Eliminar
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>¿Eliminar esta factura definitivamente?</AlertDialogTitle>
                <AlertDialogDescription>Esta acción no se puede deshacer.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={() => void handleDelete()}>Eliminar</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
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
              {factura.tipo === 'gasto' && (
                <div className="space-y-2">
                  <Label>Categoría del gasto</Label>
                  <input type="hidden" name="categoriaGasto" value={categoriaGasto ?? ''} />
                  <CategoriaGastoPicker value={categoriaGasto} onChange={setCategoriaGasto} />
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="moneda-edit">Moneda</Label>
                <select
                  id="moneda-edit"
                  value={monedaEdit}
                  onChange={async (e) => {
                    const nuevaMoneda = e.target.value
                    setMonedaEdit(nuevaMoneda)
                    if (nuevaMoneda === 'EUR') {
                      setTipoCambioEdit(1)
                      return
                    }
                    setCargandoTasaEdit(true)
                    const tasa = await obtenerTasaCambio(nuevaMoneda, 'EUR')
                    setTipoCambioEdit(tasa)
                    setCargandoTasaEdit(false)
                  }}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  {MOEDAS.map(m => (
                    <option key={m.code} value={m.code}>{m.symbol} — {m.name} ({m.code})</option>
                  ))}
                </select>
              </div>
              {monedaEdit !== 'EUR' && (
                <div className="space-y-2">
                  <Label htmlFor="tipoCambio-edit">Tipo de cambio ({monedaEdit} → EUR)</Label>
                  <Input
                    id="tipoCambio-edit"
                    type="number"
                    step="0.0001"
                    value={tipoCambioEdit}
                    onChange={(e) => setTipoCambioEdit(parseFloat(e.target.value) || 1)}
                    disabled={cargandoTasaEdit}
                  />
                  {cargandoTasaEdit && <p className="text-xs text-muted-foreground">Obteniendo tipo de cambio...</p>}
                </div>
              )}
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
                  <Label htmlFor="baseImponible">Base imponible ({MOEDAS.find(m => m.code === monedaEdit)?.symbol ?? '€'})</Label>
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
                  <Label htmlFor="total">Total ({MOEDAS.find(m => m.code === monedaEdit)?.symbol ?? '€'})</Label>
                  <Input id="total" disabled value={(factura.total / 100).toFixed(2)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="notas">Notas internas</Label>
                <textarea
                  id="notas"
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  placeholder="Notas sobre esta factura..."
                  rows={3}
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
              </div>
              <div className="space-y-2">
                <Label>Etiquetas</Label>
                <div className="relative" ref={tagsDropdownRef}>
                  <button
                    type="button"
                    onClick={() => setMostrarTagsDropdown(!mostrarTagsDropdown)}
                    className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <span className={tagsSeleccionados.length === 0 ? 'text-muted-foreground' : ''}>
                      {tagsSeleccionados.length === 0 ? 'Seleccionar etiquetas...' : `${tagsSeleccionados.length} etiqueta${tagsSeleccionados.length !== 1 ? 's' : ''}`}
                    </span>
                    <svg className="h-4 w-4 opacity-50" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                  </button>
                  {mostrarTagsDropdown && (
                    <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover p-2 shadow-md">
                      <div className="max-h-60 overflow-y-auto space-y-1">
                        {TAGS_PREDEFINIDOS.map(tag => (
                          <label key={tag.id} className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent">
                            <input
                              type="checkbox"
                              className="rounded border-input"
                              checked={tagsSeleccionados.includes(tag.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setTagsSeleccionados(prev => [...prev, tag.id])
                                } else {
                                  setTagsSeleccionados(prev => prev.filter(t => t !== tag.id))
                                }
                              }}
                            />
                            <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: tag.color }} />
                            {tag.nombre}
                          </label>
                        ))}
                      </div>
                      <div className="mt-2 border-t pt-2">
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="Etiqueta personalizada..."
                            value={nuevoTagCustom}
                            onChange={(e) => setNuevoTagCustom(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault()
                                const val = nuevoTagCustom.trim().toLowerCase().replace(/\s+/g, '-')
                                if (val && !tagsSeleccionados.includes(val)) {
                                  setTagsSeleccionados(prev => [...prev, val])
                                  setNuevoTagCustom('')
                                }
                              }
                            }}
                            className="flex-1 rounded-md border border-input bg-background px-2 py-1 text-sm"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const val = nuevoTagCustom.trim().toLowerCase().replace(/\s+/g, '-')
                              if (val && !tagsSeleccionados.includes(val)) {
                                setTagsSeleccionados(prev => [...prev, val])
                                setNuevoTagCustom('')
                              }
                            }}
                          >
                            Añadir
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                {tagsSeleccionados.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {tagsSeleccionados.map(tagId => (
                      <span
                        key={tagId}
                        className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium text-white"
                        style={{ backgroundColor: obtenerColorTag(tagId) }}
                      >
                        {obtenerNombreTag(tagId)}
                        <button
                          type="button"
                          onClick={() => setTagsSeleccionados(prev => prev.filter(t => t !== tagId))}
                          className="ml-0.5 rounded-full hover:bg-white/20 h-3.5 w-3.5 flex items-center justify-center"
                          aria-label={`Quitar ${obtenerNombreTag(tagId)}`}
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
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
                <div className="rounded-md border p-3">
                  <VoiceInput
                    speech={speech}
                    parseandoVoz={parseandoVoz}
                    onParsear={handleParsearVoz}
                    compact
                  />
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
                <dd className="flex items-center gap-2">
                  <span className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${
                    factura.estado === 'pagada'
                      ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                      : factura.estado === 'vencida'
                        ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
                        : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300'
                  }`}>
                    {factura.estado}
                  </span>
                  {factura.estado !== 'pagada' && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={async () => {
                        const { error } = await getSupabase().from('facturas').update({
                          estado: 'pagada',
                        }).eq('id', factura.id)
                        if (!error) setFactura({ ...factura, estado: 'pagada' })
                      }}
                    >
                      Marcar como pagada
                    </Button>
                  )}
                </dd>
              </div>
              {(factura.moneda && factura.moneda !== 'EUR') && (
                <>
                  <div>
                    <dt className="text-muted-foreground">Moneda</dt>
                    <dd className="font-medium">{MOEDAS.find(m => m.code === factura.moneda)?.name} ({factura.moneda})</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Tipo de cambio</dt>
                    <dd className="font-medium">1 {factura.moneda} = {factura.tipoCambio?.toFixed(4)} EUR</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Total en EUR</dt>
                    <dd className="font-medium">{formatoMoneda((factura.total / 100) * (factura.tipoCambio ?? 1), 'EUR')}</dd>
                  </div>
                </>
              )}
              {parsearTags(factura.tags).length > 0 && (
                <div className="col-span-2">
                  <dt className="text-muted-foreground">Etiquetas</dt>
                  <dd className="flex flex-wrap gap-1 mt-1">
                    {parsearTags(factura.tags).map(tagId => (
                      <span
                        key={tagId}
                        className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium text-white"
                        style={{ backgroundColor: obtenerColorTag(tagId) }}
                      >
                        {obtenerNombreTag(tagId)}
                      </span>
                    ))}
                  </dd>
                </div>
              )}
            </dl>
          )}
        </CardContent>
      </Card>

      {/* Historial de cambios */}
      <Card>
        <CardContent className="pt-6">
          <h3 className="text-sm font-medium mb-4">Historial de cambios</h3>
          <TimelineFactura facturaId={factura.id} />
        </CardContent>
      </Card>

      <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enviar factura por email</DialogTitle>
            <DialogDescription>
              Se enviará la factura {factura.numero} como PDF adjunto a la dirección indicada.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="email-destino">Dirección de email</Label>
            <Input
              id="email-destino"
              type="email"
              placeholder="ejemplo@email.com"
              value={emailDestino}
              onChange={(e) => setEmailDestino(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEmailDialogOpen(false)} disabled={enviandoEmail}>
              Cancelar
            </Button>
            <Button onClick={() => void handleEnviarEmail()} disabled={!emailDestino || enviandoEmail}>
              {enviandoEmail ? 'Enviando...' : 'Enviar email'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
