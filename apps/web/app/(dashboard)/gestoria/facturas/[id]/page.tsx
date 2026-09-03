'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { ChevronLeft, Pencil, Trash2, Download, Mail, FileMinus, FilePlus, ArrowUpRight } from 'lucide-react'
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
import { SelectorMoneda } from '@/components/selector-moneda'
import { TAGS_PREDEFINIDOS, obtenerColorTag, parsearTags, serializarTags, obtenerNombreTag } from '@/lib/tags'
import { calcularDescuento, formatoDescuento } from '@/lib/descuento-factura'
import { crearRectificativa, obtenerRectificativas, calcularImporteMaximo, esNotaCredito, esNotaDebito, type RectificativaData, type TipoRectificativa } from '@/lib/rectificativa'
import { obtenerPagos, calcularSaldoPendiente, estaPagada, registrarPago, METODOS_PAGO, type PagoParcial } from '@/lib/pago-parcial'

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
  descuentoPorcentaje?: number
  pagosParciales?: string | null
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
  const [perfil, setPerfil] = useState<{ nombre: string | null; empresa_nombre: string | null; empresa_nif: string | null; empresa_direccion: string | null; logoBase64: string | null; firmaBase64: string | null } | null>(null)
  const [emailDialogOpen, setEmailDialogOpen] = useState(false)
  const [emailDestino, setEmailDestino] = useState('')
  const [enviandoEmail, setEnviandoEmail] = useState(false)
  const [plantilla, setPlantilla] = useState<PlantillaFactura>('clasico')
  const [monedaEdit, setMonedaEdit] = useState('EUR')
  const [tipoCambioEdit, setTipoCambioEdit] = useState(1)
  const [cargandoTasaEdit, setCargandoTasaEdit] = useState(false)
  const [descuentoPorcentajeEdit, setDescuentoPorcentajeEdit] = useState(0)
  const [rectificativaDialogOpen, setRectificativaDialogOpen] = useState(false)
  const [tipoRectificativa, setTipoRectificativa] = useState<TipoRectificativa>('credito')
  const [motivoRectificativa, setMotivoRectificativa] = useState('')
  const [baseRectificativa, setBaseRectificativa] = useState(0)
  const [ivaRectificativa, setIvaRectificativa] = useState(21)
  const [guardandoRectificativa, setGuardandoRectificativa] = useState(false)
  const [rectificativas, setRectificativas] = useState<RectificativaData[]>([])
  const [cargandoRectificativas, setCargandoRectificativas] = useState(false)
  const [pagoDialogOpen, setPagoDialogOpen] = useState(false)
  const [pagoImporte, setPagoImporte] = useState(0)
  const [pagoMetodo, setPagoMetodo] = useState<string>(METODOS_PAGO[0])
  const [pagoNotas, setPagoNotas] = useState('')
  const [guardandoPago, setGuardandoPago] = useState(false)
  const [pagosParciales, setPagosParciales] = useState<PagoParcial[]>([])
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
        setDescuentoPorcentajeEdit((data as Factura).descuentoPorcentaje ?? 0)
        setPagosParciales(obtenerPagos((data as unknown as { pagosParciales: string | null }).pagosParciales))
      }
      const { data: perfilData } = await getSupabase()
        .from('perfiles')
        .select('nombre, empresa_nombre, empresa_nif, empresa_direccion, logoBase64, firmaBase64')
        .eq('id', user.id)
        .single()
      if (perfilData) setPerfil(perfilData)
      setLoading(false)
    }
    fetchFactura()
  }, [params.id, getSupabase])

  useEffect(() => {
    if (!factura) return
    const fetchRectificativas = async () => {
      const { data: { user } } = await getSupabase().auth.getUser()
      if (!user) return
      setCargandoRectificativas(true)
      const result = await obtenerRectificativas(user.id, factura.numero)
      if (result.ok && result.data) {
        setRectificativas(result.data)
      }
      setCargandoRectificativas(false)
    }
    fetchRectificativas()
  }, [factura, getSupabase])

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
    const descuento = calcularDescuento(baseImponible, descuentoPorcentajeEdit)
    const importeIva = Math.round(baseImponible * (iva / 100))
    const total = baseImponible + importeIva - descuento

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
      descuentoPorcentaje: descuentoPorcentajeEdit,
    }).eq('id', factura.id)

    if (!error) {
      const antes = {
        numero: factura.numero,
        tipo: factura.tipo,
        emisorReceptor: factura.emisorReceptor,
        nifContraparte: factura.nifContraparte,
        fechaEmision: factura.fechaEmision,
        baseImponible: factura.baseImponible,
        iva: factura.iva,
        total: factura.total,
        estado: factura.estado,
      }
      const despues = {
        numero: form.get('numero') as string,
        tipo: form.get('tipo') as string,
        emisorReceptor: form.get('emisorReceptor') as string,
        nifContraparte: form.get('nifContraparte') as string,
        fechaEmision: form.get('fechaEmision') as string,
        baseImponible,
        iva,
        total,
      }
      await logAccion('editar', 'factura', factura.id, `Factura ${factura.numero} editada`, { antes, despues })
      setFactura({ ...factura, ...Object.fromEntries(form), moneda: monedaEdit, tipoCambio: tipoCambioEdit, descuentoPorcentaje: descuentoPorcentajeEdit } as unknown as Factura)
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

  const handleCrearRectificativa = async () => {
    if (!factura || !motivoRectificativa.trim()) return
    setGuardandoRectificativa(true)
    try {
      const result = await crearRectificativa(
        factura.id,
        {
          id: factura.id,
          numero: factura.numero,
          tipo: factura.tipo,
          emisorReceptor: factura.emisorReceptor,
          nifContraparte: factura.nifContraparte,
          baseImponible: factura.baseImponible,
          iva: factura.iva,
          total: factura.total,
          estado: factura.estado,
        },
        tipoRectificativa,
        motivoRectificativa.trim(),
        baseRectificativa,
        ivaRectificativa
      )
      if (result.ok) {
        await logAccion('crear', 'factura', factura.id, `Rectificativa ${tipoRectificativa === 'credito' ? 'nota de crédito' : 'nota de débito'} creada para factura ${factura.numero}`, {
          tipo: 'rectificativa',
          motivo: motivoRectificativa,
          baseRectificativa,
        })
        toast.success(`Nota de ${tipoRectificativa === 'credito' ? 'crédito' : 'débito'} creada`)
        setRectificativaDialogOpen(false)
        setMotivoRectificativa('')
        setBaseRectificativa(0)
        setIvaRectificativa(21)
        if (result.data) {
          setRectificativas(prev => [result.data!, ...prev])
        }
      } else {
        toast.error(result.error || 'Error al crear la rectificativa')
      }
    } catch {
      toast.error('Error al crear la rectificativa')
    }
    setGuardandoRectificativa(false)
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
          descuentoPorcentaje: factura.descuentoPorcentaje ?? 0,
          logoBase64: perfil?.logoBase64 ?? undefined,
          firmaBase64: perfil?.firmaBase64 ?? undefined,
        },
        plantilla
      )
      if (result.ok) {
        await logAccion('crear', 'factura', factura.id, `Email enviado a ${emailDestino}`, { tipo: 'email', destinatario: emailDestino })
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

  const handleRegistrarPago = async () => {
    if (!factura || pagoImporte <= 0) return
    setGuardandoPago(true)
    try {
      const nuevosPagos = registrarPago(pagoImporte, pagoMetodo, pagoNotas, factura.pagosParciales ?? null)
      const nuevoSaldo = calcularSaldoPendiente(factura.total, nuevosPagos)
      const nuevoEstado = nuevoSaldo <= 0 ? 'pagada' : factura.estado

      const { error } = await getSupabase().from('facturas').update({
        pagosParciales: nuevosPagos,
        ...(nuevoEstado !== factura.estado ? { estado: nuevoEstado } : {}),
      }).eq('id', factura.id)

      if (!error) {
        const pagosActualizados = obtenerPagos(nuevosPagos)
        setPagosParciales(pagosActualizados)
        if (nuevoEstado !== factura.estado) {
          await logAccion('cambio_estado', 'factura', factura.id, `Factura ${factura.numero}: ${factura.estado} → pagada (pago parcial completado)`, { antes: { estado: factura.estado }, despues: { estado: nuevoEstado } })
          setFactura({ ...factura, estado: nuevoEstado, pagosParciales: nuevosPagos })
        } else {
          setFactura({ ...factura, pagosParciales: nuevosPagos })
        }
        await logAccion('crear', 'factura', factura.id, `Pago registrado: ${formatMoney(pagoImporte)} (${pagoMetodo})`, { tipo: 'pago_parcial', importe: pagoImporte, metodo: pagoMetodo })
        toast.success(`Pago de ${formatMoney(pagoImporte)} registrado`)
        setPagoDialogOpen(false)
        setPagoImporte(0)
        setPagoNotas('')
      } else {
        toast.error('Error al registrar el pago')
      }
    } catch {
      toast.error('Error al registrar el pago')
    }
    setGuardandoPago(false)
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
            notas: notas || null,
            descuentoPorcentaje: factura.descuentoPorcentaje ?? 0,
            logoBase64: perfil?.logoBase64 ?? undefined,
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
          <Button variant="outline" size="sm" onClick={() => {
            void logAccion('crear', 'factura', factura.id, `PDF descargado para factura ${factura.numero}`, { tipo: 'pdf_descargada' })
            void generarFacturaClientePDF({
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
              descuentoPorcentaje: factura.descuentoPorcentaje ?? 0,
              pagosParciales: pagosParciales.length > 0 ? pagosParciales : undefined,
              logoBase64: perfil?.logoBase64 ?? undefined,
              firmaBase64: perfil?.firmaBase64 ?? undefined,
            }, plantilla)
          }}>
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
                <SelectorMoneda
                  id="moneda-edit"
                  value={monedaEdit}
                  onChange={async (nuevaMoneda) => {
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
                />
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
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="descuentoPorcentaje">Descuento (%)</Label>
                  <Input
                    id="descuentoPorcentaje"
                    name="descuentoPorcentaje"
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    value={descuentoPorcentajeEdit}
                    onChange={(e) => setDescuentoPorcentajeEdit(parseFloat(e.target.value) || 0)}
                  />
                </div>
                {descuentoPorcentajeEdit > 0 && (
                  <div className="space-y-2">
                    <Label>Importe descuento ({MOEDAS.find(m => m.code === monedaEdit)?.symbol ?? '€'})</Label>
                    <Input
                      disabled
                      value={`-${formatoMoneda(calcularDescuento(factura.baseImponible, descuentoPorcentajeEdit) / 100, monedaEdit)}`}
                    />
                  </div>
                )}
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
              {(factura.descuentoPorcentaje ?? 0) > 0 && (
                <div>
                  <dt className="text-muted-foreground">Descuento</dt>
                  <dd className="font-medium text-green-600">{formatoDescuento(factura.descuentoPorcentaje!)}</dd>
                </div>
              )}
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
                        const estadoAnterior = factura.estado
                        const { error } = await getSupabase().from('facturas').update({
                          estado: 'pagada',
                        }).eq('id', factura.id)
                        if (!error) {
                          await logAccion('cambio_estado', 'factura', factura.id, `Factura ${factura.numero}: ${estadoAnterior} → pagada`, { antes: { estado: estadoAnterior }, despues: { estado: 'pagada' } })
                          setFactura({ ...factura, estado: 'pagada' })
                        }
                      }}
                    >
                      Marcar como pagada
                    </Button>
                  )}
                </dd>
              </div>
              {factura.estado !== 'pagada' && (
                <div className="col-span-2">
                  <div className="rounded-md border p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-medium">Pagos parciales</h4>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => {
                          setPagoImporte(calcularSaldoPendiente(factura.total, factura.pagosParciales ?? null))
                          setPagoDialogOpen(true)
                        }}
                      >
                        <FilePlus className="mr-1 h-3 w-3" aria-hidden="true" />
                        Registrar pago
                      </Button>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Pagado: {formatMoney(pagosParciales.reduce((s, p) => s + p.importe, 0))}</span>
                        <span className="text-muted-foreground">Pendiente: {formatMoney(calcularSaldoPendiente(factura.total, factura.pagosParciales ?? null))}</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-green-500 transition-all"
                          style={{ width: `${Math.min(100, (pagosParciales.reduce((s, p) => s + p.importe, 0) / factura.total) * 100)}%` }}
                        />
                      </div>
                    </div>
                    {pagosParciales.length > 0 && (
                      <div className="space-y-1.5">
                        {pagosParciales.map((pago) => (
                          <div key={pago.id} className="flex items-center justify-between rounded bg-muted/50 px-3 py-1.5 text-xs">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{formatMoney(pago.importe)}</span>
                              <span className="text-muted-foreground capitalize">{pago.metodo}</span>
                              {pago.notas && <span className="text-muted-foreground">— {pago.notas}</span>}
                            </div>
                            <span className="text-muted-foreground">{new Date(pago.fecha).toLocaleDateString('es-ES')}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
              {(factura.estado === 'pagada' || factura.estado === 'pendiente') && factura.tipo !== 'rectificativa' && (
                <div className="col-span-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setBaseRectificativa(factura.baseImponible)
                      setIvaRectificativa(factura.iva)
                      setRectificativaDialogOpen(true)
                    }}
                  >
                    <FileMinus className="mr-2 h-4 w-4" aria-hidden="true" />
                    Crear rectificativa
                  </Button>
                </div>
              )}
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

      {/* Rectificativas vinculadas */}
      {(rectificativas.length > 0 || cargandoRectificativas) && (
        <Card>
          <CardContent className="pt-6">
            <h3 className="text-sm font-medium mb-4">Rectificativas vinculadas</h3>
            {cargandoRectificativas ? (
              <p className="text-xs text-muted-foreground">Cargando...</p>
            ) : (
              <div className="space-y-2">
                {rectificativas.map(r => (
                  <div key={r.id} className="flex items-center justify-between rounded-md border p-3">
                    <div className="flex items-center gap-3">
                      {esNotaCredito(r.tags) ? (
                        <FileMinus className="h-4 w-4 text-green-600" aria-hidden="true" />
                      ) : (
                        <FilePlus className="h-4 w-4 text-orange-600" aria-hidden="true" />
                      )}
                      <div>
                        <p className="text-sm font-medium">{r.numero}</p>
                        <p className="text-xs text-muted-foreground">
                          {esNotaCredito(r.tags) ? 'Nota de crédito' : 'Nota de débito'} —{' '}
                          {formatMoney(r.total)} —{' '}
                          {new Date(r.fechaEmision).toLocaleDateString('es-ES')}
                        </p>
                      </div>
                    </div>
                    <Link href={`/gestoria/facturas/${r.id}`}>
                      <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={`Ver rectificativa ${r.numero}`}>
                        <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Dialog crear rectificativa */}
      <Dialog open={rectificativaDialogOpen} onOpenChange={setRectificativaDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Crear rectificativa</DialogTitle>
            <DialogDescription>
              Crear nota de {tipoRectificativa === 'credito' ? 'crédito' : 'débito'} para la factura {factura?.numero}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Tipo de rectificativa</Label>
              <div className="flex gap-2">
                <Button
                  variant={tipoRectificativa === 'credito' ? 'secondary' : 'outline'}
                  size="sm"
                  onClick={() => setTipoRectificativa('credito')}
                  className="flex-1"
                >
                  <FileMinus className="mr-2 h-4 w-4" aria-hidden="true" />
                  Nota de crédito
                </Button>
                <Button
                  variant={tipoRectificativa === 'debito' ? 'secondary' : 'outline'}
                  size="sm"
                  onClick={() => setTipoRectificativa('debito')}
                  className="flex-1"
                >
                  <FilePlus className="mr-2 h-4 w-4" aria-hidden="true" />
                  Nota de débito
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                {tipoRectificativa === 'credito'
                  ? 'Reduce el importe a cobrar/pagar (devoluciones, descuentos, errores a favor del cliente).'
                  : 'Incrementa el importe a cobrar/pagar (errores en contra del cliente, olvidos de factura).'}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="motivo-rectificativa">Motivo</Label>
              <textarea
                id="motivo-rectificativa"
                value={motivoRectificativa}
                onChange={(e) => setMotivoRectificativa(e.target.value)}
                placeholder="Describe el motivo de la rectificación..."
                rows={3}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="base-rectificativa">
                Base imponible rectificada ({MOEDAS.find(m => m.code === (factura?.moneda || 'EUR'))?.symbol ?? '€'})
              </Label>
              <input
                id="base-rectificativa"
                type="range"
                min={0}
                max={factura ? calcularImporteMaximo(factura.baseImponible, factura.iva) / 100 : 0}
                step={0.01}
                value={baseRectificativa / 100}
                onChange={(e) => setBaseRectificativa(Math.round(parseFloat(e.target.value) * 100))}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>0 €</span>
                <span className="font-medium text-foreground">{formatMoney(baseRectificativa)}</span>
                <span>{factura ? formatMoney(factura.baseImponible) : '0 €'}</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="iva-rectificativa">IVA (%)</Label>
              <select
                id="iva-rectificativa"
                value={ivaRectificativa}
                onChange={(e) => setIvaRectificativa(parseInt(e.target.value, 10))}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                {[21, 10, 4, 0].map((t) => (
                  <option key={t} value={t}>{t}%</option>
                ))}
              </select>
            </div>
            <div className="rounded-md bg-muted p-3">
              <div className="flex justify-between text-sm">
                <span>Base:</span>
                <span>{formatMoney(baseRectificativa)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>IVA ({ivaRectificativa}%):</span>
                <span>{formatMoney(Math.round(baseRectificativa * (ivaRectificativa / 100)))}</span>
              </div>
              <div className="flex justify-between text-sm font-medium border-t mt-1 pt-1">
                <span>Total:</span>
                <span>{formatMoney(baseRectificativa + Math.round(baseRectificativa * (ivaRectificativa / 100)))}</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRectificativaDialogOpen(false)} disabled={guardandoRectificativa}>
              Cancelar
            </Button>
            <Button
              onClick={() => void handleCrearRectificativa()}
              disabled={!motivoRectificativa.trim() || baseRectificativa <= 0 || guardandoRectificativa}
            >
              {guardandoRectificativa ? 'Creando...' : `Crear nota de ${tipoRectificativa === 'credito' ? 'crédito' : 'débito'}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog registrar pago parcial */}
      <Dialog open={pagoDialogOpen} onOpenChange={setPagoDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar pago parcial</DialogTitle>
            <DialogDescription>
              Registrar un pago para la factura {factura?.numero}. Saldo pendiente: {formatMoney(calcularSaldoPendiente(factura?.total ?? 0, factura?.pagosParciales ?? null))}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pago-importe">Importe</Label>
              <Input
                id="pago-importe"
                type="number"
                step="0.01"
                min="0.01"
                max={calcularSaldoPendiente(factura?.total ?? 0, factura?.pagosParciales ?? null)}
                value={pagoImporte / 100}
                onChange={(e) => setPagoImporte(Math.round(parseFloat(e.target.value || '0') * 100))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pago-metodo">Método de pago</Label>
              <select
                id="pago-metodo"
                value={pagoMetodo}
                onChange={(e) => setPagoMetodo(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                {METODOS_PAGO.map((m) => (
                  <option key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="pago-notas">Notas</Label>
              <Input
                id="pago-notas"
                value={pagoNotas}
                onChange={(e) => setPagoNotas(e.target.value)}
                placeholder="Referencia, concepto..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPagoDialogOpen(false)} disabled={guardandoPago}>
              Cancelar
            </Button>
            <Button
              onClick={() => void handleRegistrarPago()}
              disabled={pagoImporte <= 0 || guardandoPago}
            >
              {guardandoPago ? 'Guardando...' : 'Registrar pago'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
