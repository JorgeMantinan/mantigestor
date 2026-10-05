'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { FileMinus, FilePlus, ArrowUpRight, History } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { toast } from 'sonner'
import { enviarFacturaPorEmail } from '@/lib/factura-email'
import { useSpeechRecognition } from '@/hooks/use-speech-recognition'
import { useParsearVoz } from '@/hooks/use-parsear-voz'
import { logAccion } from '@/lib/audit-log'
import { descargarFacturaXML } from '@/lib/factura-xml'
import { generarFacturaClientePDF, type PlantillaFactura } from '@/lib/factura-cliente-pdf'
import { TimelineFactura } from '@/components/timeline-factura'
import { MOEDAS, formatoMoneda } from '@/lib/divisas'
import { parsearTags, serializarTags, obtenerColorTag, obtenerNombreTag } from '@/lib/tags'
import { obtenerPlantillas, renderPlantilla } from '@/lib/plantillas-email'
import { calcularDescuento, formatoDescuento } from '@/lib/descuento-factura'
import { useLanguage } from '@/contexts/language-context'
import { usePersonaActiva } from '@/contexts/persona-activa-context'
import { crearRectificativa, obtenerRectificativas, calcularImporteMaximo, esNotaCredito, type RectificativaData, type TipoRectificativa } from '@/lib/rectificativa'
import { obtenerPagos, calcularSaldoPendiente, registrarPago, METODOS_PAGO, type PagoParcial } from '@/lib/pago-parcial'
import { FacturaHeader } from '@/components/facturas/factura-header'
import { FacturaForm } from '@/components/facturas/factura-form'
import { FacturaEmailPreview } from '@/components/facturas/factura-email-preview'

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
  notas?: string | null
  notasPrivadas?: string | null
  tags?: string | null
  moneda?: string
  tipoCambio?: number
  descuentoPorcentaje?: number
  pagosParciales?: string | null
}

export default function FacturaDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const { t } = useLanguage()
  const { perfilActivoId } = usePersonaActiva()
  const [factura, setFactura] = useState<Factura | null>(null)
  const [editing, setEditing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [categoriaGasto, setCategoriaGasto] = useState<string | null>(null)
  const [notas, setNotas] = useState<string>('')
  const [notasPrivadas, setNotasPrivadas] = useState<string>('')
  const [versiones, setVersiones] = useState<{ id: string; version: number; datos: Record<string, unknown>; creadoEn: string }[]>([])
  const [cargandoVersiones, setCargandoVersiones] = useState(false)
  const [tagsSeleccionados, setTagsSeleccionados] = useState<string[]>([])
  const [nuevoTagCustom, setNuevoTagCustom] = useState('')
  const [mostrarTagsDropdown, setMostrarTagsDropdown] = useState(false)
  const [perfil, setPerfil] = useState<{ nombre: string | null; email: string | null; empresa_nombre: string | null; empresa_nif: string | null; empresa_direccion: string | null; logoBase64: string | null; firmaBase64: string | null; idiomaFactura: string | null } | null>(null)
  const [emailDialogOpen, setEmailDialogOpen] = useState(false)
  const [emailDestino, setEmailDestino] = useState('')
  const [enviandoEmail, setEnviandoEmail] = useState(false)
  const [plantilla, setPlantilla] = useState<PlantillaFactura>('clasico')
  const [plantillaEmailId, setPlantillaEmailId] = useState('envio-factura')
  const [asuntoEmail, setAsuntoEmail] = useState('')
  const [cuerpoEmail, setCuerpoEmail] = useState('')
  const [monedaEdit, setMonedaEdit] = useState('EUR')
  const [tipoCambioEdit, setTipoCambioEdit] = useState(1)
  const [cargandoTasaEdit, _setCargandoTasaEdit] = useState(false)
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
  const [guardandoEstado, setGuardandoEstado] = useState(false)
  const [guardandoEliminacion, setGuardandoEliminacion] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)
  const tagsDropdownRef = useRef<HTMLDivElement>(null)
  const speech = useSpeechRecognition()
  const { parseandoVoz, parsearVoz } = useParsearVoz({ formRef })

  const getSupabase = useCallback(() => createClient(), [])

  useEffect(() => {
    const fetchFactura = async () => {
      const { data: { user } } = await getSupabase().auth.getUser()
      if (!user) { setLoading(false); return }
      const perfilId = perfilActivoId ?? user.id
      const { data } = await getSupabase()
        .from('facturas')
        .select('*')
        .eq('id', params.id)
        .eq('perfilId', perfilId)
        .single()
      if (data) {
        setFactura(data as Factura)
        setCategoriaGasto((data as Factura).categoriaGasto ?? null)
        setNotas((data as Factura).notas ?? '')
        setNotasPrivadas((data as Factura).notasPrivadas ?? '')
        setTagsSeleccionados(parsearTags((data as Factura).tags))
        setMonedaEdit((data as Factura).moneda ?? 'EUR')
        setTipoCambioEdit((data as Factura).tipoCambio ?? 1)
        setDescuentoPorcentajeEdit((data as Factura).descuentoPorcentaje ?? 0)
        setPagosParciales(obtenerPagos((data as Factura).pagosParciales ?? null))
      }
      const { data: perfilData } = await getSupabase()
        .from('perfiles')
        .select('nombre, email, empresa_nombre, empresa_nif, empresa_direccion, logoBase64, firmaBase64, idiomaFactura')
        .eq('id', perfilId)
        .single()
      if (perfilData) setPerfil(perfilData)
      setLoading(false)
    }
    fetchFactura()
  }, [params.id, getSupabase, perfilActivoId])

  useEffect(() => {
    if (!factura) return
    const ctrl = new AbortController()
    const fetchVersiones = async () => {
      setCargandoVersiones(true)
      try {
        const res = await fetch(`/api/fiscal/versiones?entidad=factura&entidadId=${factura.id}`, { signal: ctrl.signal })
        if (res.ok) {
          const { data } = await res.json()
          setVersiones(data ?? [])
        }
      } catch {
        // Silently fail
      }
      setCargandoVersiones(false)
    }
    fetchVersiones()
    return () => ctrl.abort()
  }, [factura])

  useEffect(() => {
    if (!factura) return
    const fetchRectificativas = async () => {
      const { data: { user } } = await getSupabase().auth.getUser()
      if (!user) return
      setCargandoRectificativas(true)
      const result = await obtenerRectificativas(perfilActivoId ?? user.id, factura.numero)
      if (result.ok && result.data) {
        setRectificativas(result.data)
      }
      setCargandoRectificativas(false)
    }
    fetchRectificativas()
  }, [factura, getSupabase, perfilActivoId])

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

    try {
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
        notasPrivadas: notasPrivadas || null,
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
        setFactura({ ...factura,
          numero: form.get('numero') as string,
          tipo: form.get('tipo') as string,
          emisorReceptor: form.get('emisorReceptor') as string,
          nifContraparte: form.get('nifContraparte') as string,
          fechaEmision: form.get('fechaEmision') as string,
          baseImponible,
          iva,
          total,
          moneda: monedaEdit,
          tipoCambio: tipoCambioEdit,
          descuentoPorcentaje: descuentoPorcentajeEdit,
        } as unknown as Factura)
        setEditing(false)
      } else {
        toast.error('Error al guardar la factura')
      }
    } catch {
      toast.error('Error al guardar la factura')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!factura) return
    setGuardandoEliminacion(true)
    try {
      const { error } = await getSupabase().from('facturas').delete().eq('id', factura.id)
      if (error) throw error
      await logAccion('eliminar', 'factura', factura.id, `Factura ${factura.numero} eliminada`)
      router.push('/gestoria/facturas')
    } catch {
      toast.error('Error al eliminar la factura')
      setGuardandoEliminacion(false)
    }
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
        toast.success(tipoRectificativa === 'credito' ? t('facturaDetalle.notaCreditCreada') : t('facturaDetalle.notaDebitoCreada'))
        setRectificativaDialogOpen(false)
        setMotivoRectificativa('')
        setBaseRectificativa(0)
        setIvaRectificativa(21)
        if (result.data) {
          setRectificativas(prev => [result.data!, ...prev])
        }
      } else {
        toast.error(result.error || t('facturaDetalle.errorCrearRectificativa'))
      }
    } catch {
      toast.error(t('facturaDetalle.errorCrearRectificativa'))
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
          idioma: (perfil?.idiomaFactura as 'es' | 'en') ?? 'es',
        },
        plantilla,
        asuntoEmail || undefined,
        cuerpoEmail || undefined
      )
      if (result.ok) {
        await logAccion('crear', 'factura', factura.id, `Email enviado a ${emailDestino}`, { tipo: 'email', destinatario: emailDestino })
        toast.success(result.skipped ? t('facturaDetalle.emailNoEnviado') : `${t('facturaDetalle.emailEnviado')} ${emailDestino}`)
        setEmailDialogOpen(false)
      } else {
        toast.error(result.error || t('facturaDetalle.errorEnviarEmail'))
      }
    } catch {
      toast.error(t('facturaDetalle.errorEnviarEmail'))
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
        toast.error(t('facturaDetalle.errorRegistrarPago'))
      }
    } catch {
      toast.error(t('facturaDetalle.errorRegistrarPago'))
    }
    setGuardandoPago(false)
  }

  function handleParsearVoz() {
    void parsearVoz(speech.transcripcion)
    speech.limpiar()
  }

  const formatMoney = (cents: number) =>
    formatoMoneda(cents / 100, factura?.moneda ?? 'EUR')

  if (loading) return <div className="text-center text-muted-foreground py-12">{t('facturaDetalle.cargando')}</div>
  if (!factura) return <div className="text-center text-muted-foreground py-12">Factura no encontrada</div>

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <FacturaHeader
        facturaNumero={factura.numero}
        facturaTipo={factura.tipo}
        fechaEmision={factura.fechaEmision}
        plantilla={plantilla}
        onPlantillaChange={setPlantilla}
        onEmailOpen={() => {
          const looksLikeEmail = /@.*\./.test(factura.emisorReceptor)
          setEmailDestino(looksLikeEmail ? factura.emisorReceptor : '')
          const plantillas = obtenerPlantillas()
          const defaultPlantilla = plantillas.find(p => p.id === 'envio-factura') ?? plantillas[0]
          if (defaultPlantilla) {
            const { asunto, cuerpo } = renderPlantilla(defaultPlantilla, {
              numero: factura.numero,
              emisorReceptor: factura.emisorReceptor,
              nifContraparte: factura.nifContraparte,
              fechaEmision: factura.fechaEmision,
              baseImponible: factura.baseImponible,
              iva: factura.iva,
              total: factura.total,
              tipo: factura.tipo,
            }, {
              nombre: perfil?.nombre ?? null,
              empresa_nombre: perfil?.empresa_nombre ?? null,
            })
            setPlantillaEmailId('envio-factura')
            setAsuntoEmail(asunto)
            setCuerpoEmail(cuerpo)
          }
          setEmailDialogOpen(true)
        }}
        onPdfDownload={() => {
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
            qrUrl: `${window.location.origin}/factura?token=${factura.id}`,
            idioma: (perfil?.idiomaFactura as 'es' | 'en') ?? 'es',
          }, plantilla)
        }}
        onXmlDownload={() => {
          void logAccion('crear', 'factura', factura.id, `XML descargado para factura ${factura.numero}`, { tipo: 'xml_descargado' })
          descargarFacturaXML(
            {
              numero: factura.numero,
              fechaEmision: factura.fechaEmision,
              emisorReceptor: factura.emisorReceptor,
              nifContraparte: factura.nifContraparte,
              baseImponible: factura.baseImponible,
              iva: factura.iva,
              total: factura.total,
              tipo: factura.tipo,
              notas,
            },
            {
              nombre: perfil?.empresa_nombre ?? perfil?.nombre ?? null,
              nif: perfil?.empresa_nif ?? null,
              direccion: perfil?.empresa_direccion ?? null,
              email: perfil?.email ?? null,
            }
          )
        }}
        onEditToggle={() => setEditing(!editing)}
        onDelete={() => void handleDelete()}
        guardandoEliminacion={guardandoEliminacion}
        vistaPreviaDatos={{
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
        }}
      />

      <Card>
        <CardHeader>
          <CardTitle>
            {editing ? t('facturaDetalle.editarFactura') : t('facturaDetalle.detalleFactura')}
          </CardTitle>
          <CardDescription>
            {editing ? t('facturaDetalle.modificaCampos') : t('facturaDetalle.infoCompleta')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {editing ? (
            <FacturaForm
              formRef={formRef}
              factura={factura}
              categoriaGasto={categoriaGasto}
              onCategoriaGastoChange={setCategoriaGasto}
              monedaEdit={monedaEdit}
              onMonedaChange={setMonedaEdit}
              tipoCambioEdit={tipoCambioEdit}
              onTipoCambioChange={setTipoCambioEdit}
              cargandoTasaEdit={cargandoTasaEdit}
              descuentoPorcentajeEdit={descuentoPorcentajeEdit}
              onDescuentoChange={setDescuentoPorcentajeEdit}
              notas={notas}
              onNotasChange={setNotas}
              tagsSeleccionados={tagsSeleccionados}
              onTagsChange={setTagsSeleccionados}
              mostrarTagsDropdown={mostrarTagsDropdown}
              onToggleTagsDropdown={() => setMostrarTagsDropdown(!mostrarTagsDropdown)}
              tagsDropdownRef={tagsDropdownRef}
              nuevoTagCustom={nuevoTagCustom}
              onNuevoTagCustomChange={setNuevoTagCustom}
              onAddCustomTag={() => {
                const val = nuevoTagCustom.trim().toLowerCase().replace(/\s+/g, '-')
                if (val && !tagsSeleccionados.includes(val)) {
                  setTagsSeleccionados(prev => [...prev, val])
                  setNuevoTagCustom('')
                }
              }}
              speech={speech}
              parseandoVoz={parseandoVoz}
              onParsearVoz={handleParsearVoz}
              onSave={handleSave}
              onCancel={() => setEditing(false)}
              saving={saving}
            />
          ) : (
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-muted-foreground">{t('facturaDetalle.numeroFactura')}</dt>
                <dd className="font-medium">{factura.numero}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">{t('facturaDetalle.tipo')}</dt>
                <dd className="font-medium capitalize">{factura.tipo === 'ingreso' ? t('facturaDetalle.emitida') : t('facturaDetalle.recibida')}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">{t('facturaDetalle.contraparte')}</dt>
                <dd className="font-medium">{factura.emisorReceptor}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">{t('facturaDetalle.nifCif')}</dt>
                <dd className="font-medium">{factura.nifContraparte ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">{t('facturaDetalle.fechaEmision')}</dt>
                <dd className="font-medium">{new Date(factura.fechaEmision).toLocaleDateString('es-ES')}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">{t('facturaDetalle.fechaVencimiento')}</dt>
                <dd className="font-medium">{factura.fechaVencimiento ? new Date(factura.fechaVencimiento).toLocaleDateString('es-ES') : '—'}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">{t('facturaDetalle.baseImponible')}</dt>
                <dd className="font-medium">{formatMoney(factura.baseImponible)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">{t('facturaDetalle.ivaPorcentaje')}</dt>
                <dd className="font-medium">{factura.iva}%</dd>
              </div>
              {(factura.descuentoPorcentaje ?? 0) > 0 && (
                <div>
                  <dt className="text-muted-foreground">{t('facturaDetalle.descuentoPorcentaje')}</dt>
                  <dd className="font-medium text-green-600">{formatoDescuento(factura.descuentoPorcentaje!)}</dd>
                </div>
              )}
              <div className="col-span-2 border-t pt-2">
                <dt className="text-muted-foreground">{t('facturaDetalle.total')}</dt>
                <dd className="text-xl font-bold">{formatMoney(factura.total)}</dd>
              </div>
              <div className="col-span-2">
                <dt className="text-muted-foreground">{t('facturaDetalle.estadoLabel')}</dt>
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
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs"
                        >
                          {t('facturaDetalle.marcarPagada')}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>¿Marcar como pagada?</AlertDialogTitle>
                          <AlertDialogDescription>
                            La factura {factura.numero} se marcará como pagada. Esta acción se puede deshacer manualmente.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={async () => {
                            setGuardandoEstado(true)
                            try {
                              const estadoAnterior = factura.estado
                              const { error } = await getSupabase().from('facturas').update({
                                estado: 'pagada',
                              }).eq('id', factura.id)
                              if (!error) {
                                await logAccion('cambio_estado', 'factura', factura.id, `Factura ${factura.numero}: ${estadoAnterior} → pagada`, { antes: { estado: estadoAnterior }, despues: { estado: 'pagada' } })
                                setFactura({ ...factura, estado: 'pagada' })
                              } else {
                                toast.error('Error al cambiar el estado')
                              }
                            } catch {
                              toast.error('Error al cambiar el estado')
                            } finally {
                              setGuardandoEstado(false)
                            }
                          }} disabled={guardandoEstado}>Confirmar</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </dd>
              </div>
              {factura.estado !== 'pagada' && (
                <div className="col-span-2">
                  <div className="rounded-md border p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-medium">{t('facturaDetalle.pagosParciales')}</h4>
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
                        {t('facturaDetalle.registrarPago')}
                      </Button>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">{t('facturaDetalle.pagado')}: {formatMoney(pagosParciales.reduce((s, p) => s + p.importe, 0))}</span>
                        <span className="text-muted-foreground">{t('facturaDetalle.pendientePago')}: {formatMoney(calcularSaldoPendiente(factura.total, factura.pagosParciales ?? null))}</span>
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
                    {t('facturaDetalle.crearRectificativa')}
                  </Button>
                </div>
              )}
              {(factura.moneda && factura.moneda !== 'EUR') && (
                <>
                  <div>
                    <dt className="text-muted-foreground">{t('facturaDetalle.monedaLabel')}</dt>
                    <dd className="font-medium">{MOEDAS.find(m => m.code === factura.moneda)?.name} ({factura.moneda})</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">{t('facturaDetalle.tipoCambioLabel')}</dt>
                    <dd className="font-medium">1 {factura.moneda} = {factura.tipoCambio?.toFixed(4)} EUR</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">{t('facturaDetalle.totalEurLabel')}</dt>
                    <dd className="font-medium">{formatoMoneda((factura.total / 100) * (factura.tipoCambio ?? 1), 'EUR')}</dd>
                  </div>
                </>
              )}
              {parsearTags(factura.tags).length > 0 && (
                <div className="col-span-2">
                  <dt className="text-muted-foreground">{t('facturaDetalle.etiquetas')}</dt>
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
          <h3 className="text-sm font-medium mb-4">{t('facturaDetalle.historialCambios')}</h3>
          <TimelineFactura facturaId={factura.id} />
        </CardContent>
      </Card>

      {/* Notas privadas */}
      <Card>
        <CardContent className="pt-6">
          <h3 className="text-sm font-medium mb-4">{editing ? 'Notas privadas (gestor)' : 'Notas privadas (gestor)'}</h3>
          {editing ? (
            <textarea
              value={notasPrivadas}
              onChange={(e) => setNotasPrivadas(e.target.value)}
              placeholder="Notas privadas visibles solo para el gestor..."
              rows={3}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
          ) : (
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {notasPrivadas || 'Sin notas privadas'}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Rectificativas vinculadas */}
      {(rectificativas.length > 0 || cargandoRectificativas) && (
        <Card>
          <CardContent className="pt-6">
            <h3 className="text-sm font-medium mb-4">{t('facturaDetalle.rectificativasVinculadas')}</h3>
            {cargandoRectificativas ? (
              <p className="text-xs text-muted-foreground">{t('facturaDetalle.cargando')}</p>
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
                          {esNotaCredito(r.tags) ? t('facturaDetalle.notaCredito') : t('facturaDetalle.notaDebito')} —{' '}
                          {formatMoney(r.total)} —{' '}
                          {new Date(r.fechaEmision).toLocaleDateString('es-ES')}
                        </p>
                      </div>
                    </div>
                    <Link href={`/gestoria/facturas/${r.id}`}>
                      <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={`${t('facturaDetalle.verRectificativa')} ${r.numero}`}>
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
            <DialogTitle>{t('facturaDetalle.crearRectificativaTitle')}</DialogTitle>
            <DialogDescription>
              {t('facturaDetalle.crearNota')} {tipoRectificativa === 'credito' ? t('facturaDetalle.notaCredito').toLowerCase() : t('facturaDetalle.notaDebito').toLowerCase()} {t('facturaDetalle.paraFactura')} {factura?.numero}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t('facturaDetalle.tipoRectificativa')}</Label>
              <div className="flex gap-2">
                <Button
                  variant={tipoRectificativa === 'credito' ? 'secondary' : 'outline'}
                  size="sm"
                  onClick={() => setTipoRectificativa('credito')}
                  className="flex-1"
                >
                  <FileMinus className="mr-2 h-4 w-4" aria-hidden="true" />
                  {t('facturaDetalle.notaCredito')}
                </Button>
                <Button
                  variant={tipoRectificativa === 'debito' ? 'secondary' : 'outline'}
                  size="sm"
                  onClick={() => setTipoRectificativa('debito')}
                  className="flex-1"
                >
                  <FilePlus className="mr-2 h-4 w-4" aria-hidden="true" />
                  {t('facturaDetalle.notaDebito')}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                {tipoRectificativa === 'credito'
                  ? t('facturaDetalle.reduceImporte')
                  : t('facturaDetalle.incrementaImporte')}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="motivo-rectificativa">{t('facturaDetalle.motivo')}</Label>
              <textarea
                id="motivo-rectificativa"
                value={motivoRectificativa}
                onChange={(e) => setMotivoRectificativa(e.target.value)}
                placeholder={t('facturaDetalle.placeholderMotivo')}
                rows={3}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="base-rectificativa">
                {t('facturaDetalle.baseRectificada')} ({MOEDAS.find(m => m.code === (factura?.moneda || 'EUR'))?.symbol ?? '€'})
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
                <Label htmlFor="iva-rectificativa">{t('facturaDetalle.ivaPorcentaje')}</Label>
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
              {t('facturaDetalle.cancelar')}
            </Button>
            <Button
              onClick={() => void handleCrearRectificativa()}
              disabled={!motivoRectificativa.trim() || baseRectificativa <= 0 || guardandoRectificativa}
            >
              {guardandoRectificativa ? t('facturaDetalle.creando') : `${t('facturaDetalle.crearNota')} ${tipoRectificativa === 'credito' ? t('facturaDetalle.notaCredito').toLowerCase() : t('facturaDetalle.notaDebito').toLowerCase()}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog registrar pago parcial */}
      <Dialog open={pagoDialogOpen} onOpenChange={setPagoDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('facturaDetalle.registrarPagoTitle')}</DialogTitle>
            <DialogDescription>
              {t('facturaDetalle.registrarPagoDesc')} {factura?.numero}. {t('facturaDetalle.saldoPendiente')}: {formatMoney(calcularSaldoPendiente(factura?.total ?? 0, factura?.pagosParciales ?? null))}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pago-importe">{t('facturaDetalle.importeLabel')}</Label>
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
              <Label htmlFor="pago-metodo">{t('facturaDetalle.metodoPago')}</Label>
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
              <Label htmlFor="pago-notas">{t('facturaDetalle.notasLabel')}</Label>
              <Input
                id="pago-notas"
                value={pagoNotas}
                onChange={(e) => setPagoNotas(e.target.value)}
                placeholder={t('facturaDetalle.placeholderNotasPago')}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPagoDialogOpen(false)} disabled={guardandoPago}>
              {t('facturaDetalle.cancelar')}
            </Button>
            <Button
              onClick={() => void handleRegistrarPago()}
              disabled={pagoImporte <= 0 || guardandoPago}
            >
              {guardandoPago ? t('facturaDetalle.guardando') : t('facturaDetalle.registrarPago')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Historial de versiones */}
      {(versiones.length > 0 || cargandoVersiones) && (
        <Card>
          <CardContent className="pt-6">
            <h3 className="text-sm font-medium mb-4">Historial de versiones</h3>
            {cargandoVersiones ? (
              <p className="text-xs text-muted-foreground">{t('facturaDetalle.cargando')}</p>
            ) : (
              <div className="space-y-2">
                {versiones.map(v => (
                  <div key={v.id} className="flex items-center justify-between rounded-md border p-3">
                    <div className="flex items-center gap-3">
                      <History className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                      <div>
                        <p className="text-sm font-medium">Versión {v.version}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(v.creadoEn).toLocaleDateString('es-ES')} {new Date(v.creadoEn).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {String((v.datos as Record<string, unknown>).numero ?? '—')}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <FacturaEmailPreview
        open={emailDialogOpen}
        onOpenChange={setEmailDialogOpen}
        facturaNumero={factura.numero}
        emailDestino={emailDestino}
        onEmailDestinoChange={setEmailDestino}
        plantillaEmailId={plantillaEmailId}
        onPlantillaEmailIdChange={setPlantillaEmailId}
        asuntoEmail={asuntoEmail}
        onAsuntoEmailChange={setAsuntoEmail}
        cuerpoEmail={cuerpoEmail}
        onCuerpoEmailChange={setCuerpoEmail}
        enviando={enviandoEmail}
        onSend={() => void handleEnviarEmail()}
        datosFactura={{
          numero: factura.numero,
          emisorReceptor: factura.emisorReceptor,
          nifContraparte: factura.nifContraparte,
          fechaEmision: factura.fechaEmision,
          baseImponible: factura.baseImponible,
          iva: factura.iva,
          total: factura.total,
          tipo: factura.tipo,
        }}
        perfil={perfil ? { nombre: perfil.nombre, empresa_nombre: perfil.empresa_nombre } : null}
      />
    </div>
  )
}
