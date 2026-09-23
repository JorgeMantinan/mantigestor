'use client'

import { useState, useCallback, useEffect, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { ChevronLeft, ScanLine, Loader2, Lightbulb, Camera, Bookmark, ChevronDown } from 'lucide-react'
import { CategoriaGastoPicker } from '@/components/facturas/categoria-gasto-picker'
import { generarSiguienteNumeroFactura } from '@mantigestor/utils'
import { FileUpload } from '@/components/upload/FileUpload'
import Link from 'next/link'
import type { OcrResult, ModeloSugeridoOcr } from '@/lib/ocr'
import { validarFactura, type ResultadoValidacion } from '@/lib/validar-documento'
import { ValidacionOcr } from '@/components/validacion-ocr'
import { useSpeechRecognition } from '@/hooks/use-speech-recognition'
import { useParsearVoz } from '@/hooks/use-parsear-voz'
import { rellenarFormularioDesdeOcr } from '@/lib/factura-utils'
import { VoiceInput } from '@/components/facturas/voice-input'
import { MOEDAS, obtenerTasaCambio, formatoMoneda } from '@/lib/divisas'
import { SelectorMoneda } from '@/components/selector-moneda'
import { obtenerNotasPieDefecto } from '@/lib/notas-pie-factura'
import { logAccion } from '@/lib/audit-log'
import { calcularDescuento } from '@/lib/descuento-factura'
import { savePendingInvoice, type PendingInvoice } from '@/lib/offline-storage'
import { useLanguage } from '@/contexts/language-context'
import { useEmpresaActiva } from '@/contexts/empresa-activa-context'
import { usePersonaActiva } from '@/contexts/persona-activa-context'
import { esSoloLectura } from '@/lib/resolve-perfil-activo'

interface PlantillaFactura {
  id: string
  nombre: string
  tipo: string
  emisorReceptor: string
  nifContraparte: string | null
  concepto: string | null
  baseImponible: number
  iva: number
  categoriaGasto: string | null
}

const TIPOS_IVA = [21, 10, 4, 0] as const
const TIPOS_IMAGEN_PERMITIDOS = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const TAMANO_MAXIMO_IMAGEN = 5 * 1024 * 1024

export default function NuevaFacturaPage() {
  return (
    <Suspense fallback={null}>
      <NuevaFacturaContenido />
    </Suspense>
  )
}

function NuevaFacturaContenido() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { t } = useLanguage()
  const { empresaActiva } = useEmpresaActiva()
  const { perfilActivoId, personas, esPropio } = usePersonaActiva()
  const personaActiva = personas.find(p => p.perfilId === perfilActivoId)
  const soloLectura = !esPropio && personaActiva && esSoloLectura(personaActiva.rol)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [escanendo, setEscanendo] = useState(false)
  const [escaneandoImagen, setEscaneandoImagen] = useState(false)
  const [modelosSugeridos, setModelosSugeridos] = useState<ModeloSugeridoOcr[]>([])
  const [categoriaGasto, setCategoriaGasto] = useState<string | null>(null)
  const [tipoSeleccionado, setTipoSeleccionado] = useState<string>('ingreso')
  const [moneda, setMoneda] = useState('EUR')
  const [tipoCambio, setTipoCambio] = useState(1)
  const [cargandoTasa, setCargandoTasa] = useState(false)
  const [notasPie, setNotasPie] = useState<string[]>([])
  const [ocrUsado, setOcrUsado] = useState(false)
  const [descuentoPorcentaje, setDescuentoPorcentaje] = useState(0)
  const [validacionOcr, setValidacionOcr] = useState<ResultadoValidacion | null>(null)
  const [plantillas, setPlantillas] = useState<PlantillaFactura[]>([])
  const [guardandoPlantilla, setGuardandoPlantilla] = useState(false)
  const [nombrePlantilla, setNombrePlantilla] = useState('')
  const [mostrarFormPlantilla, setMostrarFormPlantilla] = useState(false)
  const [baseImponibleValor, setBaseImponibleValor] = useState(0)
  const [ivaValor, setIvaValor] = useState(21)

  const [guardandoOffline, setGuardandoOffline] = useState(false)

  const formRef = useRef<HTMLFormElement>(null)
  const speech = useSpeechRecognition()

  const aplicarResultadoOcr = useCallback((data: OcrResult) => {
    setModelosSugeridos(data.modelosSugeridos ?? [])
    if (data.categoriaGasto) setCategoriaGasto(data.categoriaGasto)
    const campos = rellenarFormularioDesdeOcr(formRef, data)
    if (campos.tipo === 'ingreso' || campos.tipo === 'gasto') setTipoSeleccionado(campos.tipo)
    if (campos.baseImponible !== null && !isNaN(campos.baseImponible)) setBaseImponibleValor(campos.baseImponible)
    if (campos.iva !== null && TIPOS_IVA.includes(campos.iva as (typeof TIPOS_IVA)[number])) setIvaValor(campos.iva)
    setOcrUsado(true)
    setValidacionOcr(validarFactura(data))
  }, [])

  const { parseandoVoz, parsearVoz } = useParsearVoz({ formRef, onParsed: aplicarResultadoOcr })

  const getSupabase = useCallback(() => createClient(), [])

  useEffect(() => {
    getSupabase().auth.getUser().then(({ data }) => {
      if (data.user?.id) {
        setUserId(data.user.id)
        getSupabase().from('facturas').select('numero').eq('perfilId', data.user.id).then(({ data: facturas }) => {
          if (facturas) {
            const nums = facturas.map(f => f.numero).filter(Boolean)
            const siguiente = generarSiguienteNumeroFactura(nums)
            const numeroInput = formRef.current?.elements.namedItem('numero')
            if (numeroInput instanceof HTMLInputElement) numeroInput.value = siguiente
          }
        })
        obtenerNotasPieDefecto(data.user.id).then(setNotasPie)
      }
    })
  }, [getSupabase])

  useEffect(() => {
    if (!userId) return
    getSupabase()
      .from('plantillas_factura')
      .select('*')
      .eq('perfilId', userId)
      .order('nombre')
      .then(({ data }) => {
        if (data) setPlantillas(data as PlantillaFactura[])
      })
  }, [getSupabase, userId])

  // Pre-relleno desde OCR en lote (?numero=...&emisorReceptor=...)
  useEffect(() => {
    if (!searchParams.get('numero') && !searchParams.get('emisorReceptor')) return
    const get = (k: string) => searchParams.get(k)
    const setField = (name: string, value: string) => {
      const el = formRef.current?.elements.namedItem(name)
      if (el instanceof HTMLInputElement || el instanceof HTMLSelectElement) el.value = value
    }
    const tipo = get('tipo')
    if (tipo === 'ingreso' || tipo === 'gasto') setTipoSeleccionado(tipo)
    const cat = get('categoriaGasto')
    if (cat) setCategoriaGasto(cat)
    const base = get('baseImponible')
    if (base) setBaseImponibleValor(parseFloat(base) || 0)
    const iva = get('iva')
    if (iva) {
      const v = parseInt(iva, 10)
      if (TIPOS_IVA.includes(v as (typeof TIPOS_IVA)[number])) setIvaValor(v)
    }
    if (get('numero')) setField('numero', get('numero')!)
    if (get('emisorReceptor')) setField('emisorReceptor', get('emisorReceptor')!)
    if (get('nifContraparte')) setField('nifContraparte', get('nifContraparte')!)
    if (get('fechaEmision')) setField('fechaEmision', get('fechaEmision')!)
    setOcrUsado(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  async function guardarPlantilla() {
    if (!userId || !nombrePlantilla.trim() || !formRef.current) return
    setGuardandoPlantilla(true)
    const form = formRef.current
    const getVal = (name: string): string => {
      const el = form.elements.namedItem(name)
      if (el instanceof HTMLInputElement || el instanceof HTMLSelectElement) return el.value
      return ''
    }
    const baseImponible = parseFloat(getVal('baseImponible') || '0') * 100
    const iva = parseInt(getVal('iva') || '21', 10)
    const emisorReceptor = getVal('emisorReceptor')
    const nifContraparte = getVal('nifContraparte') || null
    const plantillaId = crypto.randomUUID()
    const { error } = await getSupabase().from('plantillas_factura').insert({
      id: plantillaId,
      perfilId: userId,
      nombre: nombrePlantilla.trim(),
      tipo: tipoSeleccionado,
      emisorReceptor,
      nifContraparte,
      concepto: null,
      baseImponible: Math.round(baseImponible),
      iva,
      categoriaGasto,
    })
    if (!error) {
      setPlantillas(prev => [...prev, {
        id: plantillaId,
        nombre: nombrePlantilla.trim(),
        tipo: tipoSeleccionado,
        emisorReceptor,
        nifContraparte,
        concepto: null,
        baseImponible: Math.round(baseImponible),
        iva,
        categoriaGasto,
      }])
      setNombrePlantilla('')
      setMostrarFormPlantilla(false)
    }
    setGuardandoPlantilla(false)
  }

  function cargarPlantilla(p: PlantillaFactura) {
    setTipoSeleccionado(p.tipo)
    if (p.categoriaGasto) setCategoriaGasto(p.categoriaGasto)
    setBaseImponibleValor(p.baseImponible / 100)
    if (TIPOS_IVA.includes(p.iva as (typeof TIPOS_IVA)[number])) setIvaValor(p.iva)
    const setField = (name: string, value: string) => {
      const el = formRef.current?.elements.namedItem(name)
      if (el instanceof HTMLInputElement || el instanceof HTMLSelectElement) {
        el.value = value
      }
    }
    setField('emisorReceptor', p.emisorReceptor)
    setField('nifContraparte', p.nifContraparte ?? '')
  }

  async function escanearFactura() {
    if (!pdfUrl) return
    setEscanendo(true)
    setError('')
    try {
      const res = await fetch('/api/ocr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pdfUrl }),
      })
      if (!res.ok) {
        const err = await res.json()
        setError(err.error || t('facturaNueva.errorOcrServicio'))
        return
      }
      const data: OcrResult = await res.json()
      aplicarResultadoOcr(data)
    } catch {
      setError(t('facturaNueva.errorOcrServicio'))
    } finally {
      setEscanendo(false)
    }
  }

  async function escanearImagen(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    if (file.size > TAMANO_MAXIMO_IMAGEN) {
      setError('La imagen supera el tamaño máximo de 5MB')
      event.target.value = ''
      return
    }
    if (file.type && !TIPOS_IMAGEN_PERMITIDOS.includes(file.type)) {
      setError('Formato no soportado. Usa JPG, PNG, WebP o GIF')
      event.target.value = ''
      return
    }
    setEscaneandoImagen(true)
    setError('')
    try {
      const reader = new FileReader()
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsDataURL(file)
      })
      const res = await fetch('/api/ocr-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64, mediaType: file.type }),
      })
      if (!res.ok) {
        const err = await res.json()
        setError(err.error || t('facturaNueva.errorOcrImagen'))
        return
      }
      const data: OcrResult = await res.json()
      aplicarResultadoOcr(data)
    } catch {
      setError(t('facturaNueva.errorOcrServicio'))
    } finally {
      setEscaneandoImagen(false)
      event.target.value = ''
    }
  }

  function handleParsearVoz() {
    void parsearVoz(speech.transcripcion, setError)
    speech.limpiar()
  }

  const handleGuardarOffline = async () => {
    if (!formRef.current) return
    setGuardandoOffline(true)
    const form = new FormData(formRef.current)
    const { data: { user } } = await getSupabase().auth.getUser()
    if (!user) {
      setError(t('facturaNueva.errorSesion'))
      setGuardandoOffline(false)
      return
    }
    const { data: perfil } = await getSupabase().from('perfiles').select('id').eq('userId', user.id).single()
    if (!perfil) {
      setError(t('facturaNueva.errorSesion'))
      setGuardandoOffline(false)
      return
    }
    const baseImponible = parseFloat(form.get('baseImponible') as string) * 100
    const iva = parseInt(form.get('iva') as string, 10)
    const importeIva = Math.round(baseImponible * (iva / 100))
    const descuento = calcularDescuento(baseImponible, descuentoPorcentaje)
    const total = baseImponible + importeIva - descuento
    const pending: PendingInvoice = {
      id: crypto.randomUUID(),
      numero: form.get('numero') as string,
      tipo: form.get('tipo') as string,
      emisorReceptor: form.get('emisorReceptor') as string,
      nifContraparte: form.get('nifContraparte') as string || '',
      fechaEmision: form.get('fechaEmision') as string,
      fechaVencimiento: form.get('fechaVencimiento') as string || null,
      baseImponible,
      iva,
      total,
      estado: 'pendiente',
      categoriaGasto: form.get('tipo') === 'gasto' ? categoriaGasto : null,
      notas: notasPie.filter(Boolean).join('\n') || null,
      pdfUrl: pdfUrl || null,
      moneda,
      tipoCambio,
      descuentoPorcentaje,
      empresaId: empresaActiva?.id ?? null,
      perfilId: perfil.id,
      createdAt: new Date().toISOString(),
    }
    savePendingInvoice(pending)
    setGuardandoOffline(false)
    router.push('/gestoria/facturas')
  }

  async function handleMonedaChange(nuevaMoneda: string) {
    setMoneda(nuevaMoneda)
    if (nuevaMoneda === 'EUR') {
      setTipoCambio(1)
      return
    }
    setCargandoTasa(true)
    const tasa = await obtenerTasaCambio(nuevaMoneda, 'EUR')
    setTipoCambio(tasa)
    setCargandoTasa(false)
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const form = new FormData(e.currentTarget)
      const numero = (form.get('numero') as string)?.trim()
      const emisorReceptor = (form.get('emisorReceptor') as string)?.trim()
      const baseImponible = parseFloat(form.get('baseImponible') as string) * 100
      const iva = parseInt(form.get('iva') as string, 10)

      if (!numero) {
        setError(t('facturaNueva.errorNumeroObligatorio'))
        return
      }

      if (!emisorReceptor) {
        setError(t('facturaNueva.errorNombreObligatorio'))
        return
      }

      if (isNaN(baseImponible) || baseImponible <= 0) {
        setError(t('facturaNueva.errorBaseInvalida'))
        return
      }

      if (![0, 4, 10, 21].includes(iva)) {
        setError(t('facturaNueva.errorIvaInvalido'))
        return
      }

      const importeIva = Math.round(baseImponible * (iva / 100))
      const descuento = calcularDescuento(baseImponible, descuentoPorcentaje)
      const total = baseImponible + importeIva - descuento

      const { data: { user } } = await getSupabase().auth.getUser()
      if (!user) {
        setError(t('facturaNueva.errorSesion'))
        return
      }

      const { data: perfil } = await getSupabase().from('perfiles').select('id').eq('userId', user.id).single()
      if (!perfil) {
        setError(t('facturaNueva.errorSesion'))
        return
      }

      const nuevaFacturaId = crypto.randomUUID()

      const { error: insertError } = await getSupabase().from('facturas').insert({
        id: nuevaFacturaId,
        perfilId: perfil.id,
        numero: form.get('numero') as string,
        tipo: form.get('tipo') as string,
        emisorReceptor: form.get('emisorReceptor') as string,
        nifContraparte: form.get('nifContraparte') as string,
        fechaEmision: form.get('fechaEmision') as string,
        fechaVencimiento: form.get('fechaVencimiento') as string || null,
        baseImponible,
        iva,
        total,
        estado: 'pendiente',
        categoriaGasto: form.get('tipo') === 'gasto' ? categoriaGasto : null,
        notas: notasPie.filter(Boolean).join('\n') || null,
        pdfUrl: pdfUrl || null,
        moneda,
        tipoCambio,
        descuentoPorcentaje,
        empresaId: empresaActiva?.id ?? null,
      })

      if (insertError) {
        setError(insertError.message)
        return
      }

      if (ocrUsado) {
        await logAccion('crear', 'factura', nuevaFacturaId, `Factura creada con OCR`, { tipo: 'ocr' })
      }

      router.push('/gestoria/facturas')
    } catch {
      setError('Error inesperado al guardar la factura')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {soloLectura ? (
        <div className="flex flex-col items-center gap-4 py-12">
          <h1 className="text-3xl font-heading font-bold tracking-tight">{t('facturaNueva.titulo')}</h1>
          <p className="text-muted-foreground">No puedes crear facturas en modo solo lectura.</p>
          <Link href="/gestoria/facturas">
            <Button>Volver a facturas</Button>
          </Link>
        </div>
      ) : (<>
      <div className="flex items-center gap-4">
        <Link href="/gestoria/facturas">
          <Button variant="ghost" size="icon" aria-label={t('facturaNueva.volverFacturas')}>
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-heading font-bold tracking-tight">{t('facturaNueva.titulo')}</h1>
          <p className="text-muted-foreground">{t('facturaNueva.subtitulo')}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('facturaNueva.datosFactura')}</CardTitle>
          <CardDescription>{t('facturaNueva.camposObligatorios')}</CardDescription>
        </CardHeader>
        <CardContent>
          <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="tipo">{t('facturaNueva.tipo')}</Label>
                <select
                  id="tipo"
                  name="tipo"
                  required
                  value={tipoSeleccionado}
                  onChange={e => { setTipoSeleccionado(e.target.value); if (e.target.value !== 'gasto') setCategoriaGasto(null) }}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <option value="ingreso">{t('facturaNueva.tipoIngreso')}</option>
                  <option value="gasto">{t('facturaNueva.tipoGasto')}</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="numero">{t('facturaNueva.numeroFactura')}</Label>
                <Input id="numero" name="numero" required placeholder="F-2024-001" />
              </div>
            </div>

            {tipoSeleccionado === 'gasto' && (
              <div className="space-y-2">
                <Label>{t('facturaNueva.categoriaGasto')}</Label>
                <CategoriaGastoPicker value={categoriaGasto} onChange={setCategoriaGasto} />
              </div>
            )}

            <div className="space-y-2">
                <Label htmlFor="moneda">{t('facturaNueva.moneda')}</Label>
              <SelectorMoneda
                id="moneda"
                value={moneda}
                onChange={(v) => void handleMonedaChange(v)}
              />
            </div>

            {moneda !== 'EUR' && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="tipoCambio">{t('facturaNueva.tipoCambio')} ({moneda} → EUR)</Label>
                  <Input
                    id="tipoCambio"
                    type="number"
                    step="0.0001"
                    value={tipoCambio}
                    onChange={(e) => setTipoCambio(parseFloat(e.target.value) || 1)}
                    disabled={cargandoTasa}
                  />
                  {cargandoTasa && <p className="text-xs text-muted-foreground">{t('facturaNueva.cargandoTasa')}</p>}
                </div>
                <div className="space-y-2">
                  <Label>{t('facturaNueva.totalEur')}</Label>
                  <Input
                    disabled
                    value={formatoMoneda((baseImponibleValor + baseImponibleValor * (ivaValor / 100)) * tipoCambio, 'EUR')}
                  />
                </div>
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="emisorReceptor">{t('facturaNueva.nombreCliente')}</Label>
                <Input id="emisorReceptor" name="emisorReceptor" required placeholder={t('facturaNueva.placeholderNombre')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nifContraparte">{t('facturaNueva.nifCif')}</Label>
                <Input id="nifContraparte" name="nifContraparte" placeholder="12345678Z" />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="fechaEmision">{t('facturaNueva.fechaEmision')}</Label>
                <Input id="fechaEmision" name="fechaEmision" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fechaVencimiento">{t('facturaNueva.fechaVencimiento')}</Label>
                <Input id="fechaVencimiento" name="fechaVencimiento" type="date" />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="baseImponible">{t('facturaNueva.baseImponible')} ({MOEDAS.find(m => m.code === moneda)?.symbol ?? '€'})</Label>
                <Input
                    id="baseImponible"
                    name="baseImponible"
                    type="number"
                    step="0.01"
                    required
                    placeholder="100.00"
                    value={baseImponibleValor || ''}
                    onChange={(e) => setBaseImponibleValor(parseFloat(e.target.value) || 0)}
                  />
              </div>
              <div className="space-y-2">
                <Label htmlFor="iva">{t('facturaNueva.ivaPorcentaje')}</Label>
                <select
                  id="iva"
                  name="iva"
                  required
                  value={ivaValor}
                  onChange={(e) => setIvaValor(parseInt(e.target.value, 10))}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  {TIPOS_IVA.map((t) => (
                    <option key={t} value={t}>
                      {t}%
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="importeTotal">{t('facturaNueva.total')} ({MOEDAS.find(m => m.code === moneda)?.symbol ?? '€'})</Label>
                <Input id="importeTotal" disabled value={formatoMoneda((baseImponibleValor + baseImponibleValor * (ivaValor / 100) - calcularDescuento(baseImponibleValor, descuentoPorcentaje)) * tipoCambio / 100, moneda)} />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="descuentoPorcentaje">{t('facturaNueva.descuentoPorcentaje')}</Label>
                <Input
                  id="descuentoPorcentaje"
                  name="descuentoPorcentaje"
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  value={descuentoPorcentaje}
                  onChange={(e) => setDescuentoPorcentaje(parseFloat(e.target.value) || 0)}
                  placeholder="0"
                />
              </div>
              {descuentoPorcentaje > 0 && (
                <div className="space-y-2">
                  <Label>{t('facturaNueva.importeDescuento')} ({MOEDAS.find(m => m.code === moneda)?.symbol ?? '€'})</Label>
                  <Input
                    disabled
                    value={(() => {
                      const descuento = calcularDescuento(baseImponibleValor, descuentoPorcentaje)
                      return `-${formatoMoneda(descuento / 100, moneda)}`
                    })()}
                  />
                </div>
              )}
            </div>

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}

            {plantillas.length > 0 && (
              <div className="space-y-2">
                <Label>Cargar plantilla guardada</Label>
                <div className="flex flex-wrap gap-2">
                  {plantillas.map(p => (
                    <Button key={p.id} type="button" variant="outline" size="sm"
                      onClick={() => cargarPlantilla(p)}>
                      <Bookmark className="mr-1 h-3 w-3" aria-hidden="true" />
                      {p.nombre}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {mostrarFormPlantilla ? (
              <div className="flex gap-2 items-end">
                <div className="flex-1 space-y-2">
                  <Label htmlFor="nombrePlantilla">Nombre de la plantilla</Label>
                  <Input id="nombrePlantilla" value={nombrePlantilla} onChange={e => setNombrePlantilla(e.target.value)}
                    placeholder="Ej: Factura Hosting" />
                </div>
                <Button type="button" variant="secondary" size="sm" onClick={() => void guardarPlantilla()}
                  disabled={guardandoPlantilla || !nombrePlantilla.trim()}>
                  {guardandoPlantilla ? 'Guardando...' : 'Guardar'}
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => { setMostrarFormPlantilla(false); setNombrePlantilla('') }}>
                  Cancelar
                </Button>
              </div>
            ) : (
              <Button type="button" variant="ghost" size="sm" onClick={() => setMostrarFormPlantilla(true)}>
                <Bookmark className="mr-1 h-3 w-3" aria-hidden="true" />
                Guardar como plantilla
              </Button>
            )}

            <div className="flex gap-4 pt-4">
              <Link href="/gestoria/facturas" className="flex-1">
                <Button variant="outline" type="button" className="w-full">
                  {t('facturaNueva.cancelar')}
                </Button>
              </Link>
              <Button type="button" variant="secondary" onClick={handleGuardarOffline} disabled={guardandoOffline || loading} className="flex-1">
                {guardandoOffline ? 'Guardando...' : 'Guardar offline'}
              </Button>
              <Button type="submit" disabled={loading} className="flex-1">
                {loading ? t('facturaNueva.guardando') : t('facturaNueva.crearFactura')}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('facturaNueva.entradaVoz')}</CardTitle>
          <CardDescription>
            {t('facturaNueva.entradaVozDesc')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <VoiceInput
            speech={speech}
            parseandoVoz={parseandoVoz}
            onParsear={handleParsearVoz}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('facturaNueva.documentoAdjunto')}</CardTitle>
          <CardDescription>{t('facturaNueva.documentoAdjuntoDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <FileUpload
            bucket="documentos"
            path={userId ?? ''}
            tipo="factura"
            accept=".pdf"
            buttonText={t('facturaNueva.subirFacturaPdf')}
            onUploadComplete={(url) => setPdfUrl(url)}
          />
          {pdfUrl && (
            <Button
              variant="secondary"
              className="w-full"
              onClick={escanearFactura}
              disabled={escanendo}
            >
              <ScanLine className="mr-2 h-4 w-4" />
              {escanendo ? t('facturaNueva.escaneando') : t('facturaNueva.escanearIa')}
            </Button>
          )}
          <div className="relative">
            <input
              type="file"
              accept="image/*"
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              onChange={escanearImagen}
              disabled={escaneandoImagen}
            />
            <Button variant="outline" className="w-full" disabled={escaneandoImagen}>
              <Camera className="mr-2 h-4 w-4" />
              {escaneandoImagen ? t('facturaNueva.escaneando') : t('facturaNueva.escanearFoto')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {validacionOcr && (
        <ValidacionOcr
          resultado={validacionOcr}
          onCorregir={(campo, sugerencia) => {
            if (!sugerencia) return
            if (campo === 'tipo') {
              if (sugerencia === 'ingreso' || sugerencia === 'gasto') setTipoSeleccionado(sugerencia)
              return
            }
            if (campo === 'baseImponible') {
              const v = parseFloat(sugerencia)
              if (!isNaN(v)) setBaseImponibleValor(v)
              return
            }
            if (campo === 'iva') {
              const v = parseInt(sugerencia, 10)
              if (TIPOS_IVA.includes(v as (typeof TIPOS_IVA)[number])) setIvaValor(v)
              return
            }
            const input = formRef.current?.elements.namedItem(campo) as HTMLInputElement | null
            if (input) {
              input.value = sugerencia
              input.focus()
            }
          }}
        />
      )}

      {modelosSugeridos.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-yellow-500" aria-hidden="true" />
              {t('facturaNueva.modelosAfectados')}
            </CardTitle>
            <CardDescription>{t('facturaNueva.modelosAfectadosDesc')}</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {modelosSugeridos.map(m => (
                <li key={m.modelo} className="flex items-start justify-between rounded-lg border p-3">
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                      {m.modelo}
                    </span>
                    <div>
                      <p className="text-sm font-medium">Modelo {m.modelo}</p>
                      <p className="text-xs text-muted-foreground">{m.razon}</p>
                    </div>
                  </div>
                  <Link href={`/fiscal?seccion=modelo${m.modelo}`}>
                    <Button variant="ghost" size="sm" className="shrink-0">
                      {t('facturaNueva.abrir')}
                    </Button>
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
      </>)}
    </div>
  )
}
