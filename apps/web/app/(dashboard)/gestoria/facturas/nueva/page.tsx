'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { ChevronLeft, ScanLine, Loader2, Lightbulb, Camera } from 'lucide-react'
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
import { useLanguage } from '@/contexts/language-context'
import { useEmpresaActiva } from '@/contexts/empresa-activa-context'

const TIPOS_IVA = [21, 10, 4, 0] as const

export default function NuevaFacturaPage() {
  const router = useRouter()
  const { t } = useLanguage()
  const { empresaActiva } = useEmpresaActiva()
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

  const formRef = useRef<HTMLFormElement>(null)
  const speech = useSpeechRecognition()
  const { parseandoVoz, parsearVoz } = useParsearVoz({ formRef })

  const getSupabase = useCallback(() => createClient(), [])

  useEffect(() => {
    getSupabase().auth.getUser().then(({ data }) => {
      if (data.user?.id) {
        setUserId(data.user.id)
        getSupabase().from('facturas').select('numero').eq('perfilId', data.user.id).then(({ data: facturas }) => {
          if (facturas) {
            const nums = facturas.map(f => f.numero).filter(Boolean)
            const siguiente = generarSiguienteNumeroFactura(nums)
            const input = document.getElementById('numero') as HTMLInputElement | null
            if (input) input.value = siguiente
          }
        })
        obtenerNotasPieDefecto(data.user.id).then(setNotasPie)
      }
    })
  }, [getSupabase])

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
      setModelosSugeridos(data.modelosSugeridos ?? [])
      if (data.categoriaGasto) setCategoriaGasto(data.categoriaGasto)
      rellenarFormularioDesdeOcr(formRef, data)
      setOcrUsado(true)
      setValidacionOcr(validarFactura(data))
    } catch {
      setError(t('facturaNueva.errorOcrServicio'))
    }
    setEscanendo(false)
  }

  async function escanearImagen(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
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
      setModelosSugeridos(data.modelosSugeridos ?? [])
      if (data.categoriaGasto) setCategoriaGasto(data.categoriaGasto)
      rellenarFormularioDesdeOcr(formRef, data)
      setOcrUsado(true)
      setValidacionOcr(validarFactura(data))
    } catch {
      setError(t('facturaNueva.errorOcrServicio'))
    }
    setEscaneandoImagen(false)
    event.target.value = ''
  }

  function handleParsearVoz() {
    void parsearVoz(speech.transcripcion, setError)
    speech.limpiar()
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

    const form = new FormData(e.currentTarget)
    const numero = (form.get('numero') as string)?.trim()
    const emisorReceptor = (form.get('emisorReceptor') as string)?.trim()
    const baseImponible = parseFloat(form.get('baseImponible') as string) * 100
    const iva = parseInt(form.get('iva') as string, 10)

    if (!numero) {
      setError(t('facturaNueva.errorNumeroObligatorio'))
      setLoading(false)
      return
    }

    if (!emisorReceptor) {
      setError(t('facturaNueva.errorNombreObligatorio'))
      setLoading(false)
      return
    }

    if (isNaN(baseImponible) || baseImponible <= 0) {
      setError(t('facturaNueva.errorBaseInvalida'))
      setLoading(false)
      return
    }

    if (![0, 4, 10, 21].includes(iva)) {
      setError(t('facturaNueva.errorIvaInvalido'))
      setLoading(false)
      return
    }

    const importeIva = Math.round(baseImponible * (iva / 100))
    const descuento = calcularDescuento(baseImponible, descuentoPorcentaje)
    const total = baseImponible + importeIva - descuento

    const { data: { user } } = await getSupabase().auth.getUser()
    if (!user) {
      setError(t('facturaNueva.errorSesion'))
      setLoading(false)
      return
    }

    const { data: perfil } = await getSupabase().from('perfiles').select('id').eq('userId', user.id).single()
    if (!perfil) {
      setError(t('facturaNueva.errorSesion'))
      setLoading(false)
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
      setLoading(false)
      return
    }

    if (ocrUsado) {
      await logAccion('crear', 'factura', nuevaFacturaId, `Factura creada con OCR`, { tipo: 'ocr' })
    }

    router.push('/gestoria/facturas')
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
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
                    value={(() => {
                      const baseInput = document.getElementById('baseImponible') as HTMLInputElement | null
                      const ivaSelect = document.getElementById('iva') as HTMLSelectElement | null
                      const base = parseFloat(baseInput?.value || '0')
                      const iva = parseInt(ivaSelect?.value || '0', 10)
                      const totalLocal = base + base * (iva / 100)
                      return formatoMoneda(totalLocal * tipoCambio, 'EUR')
                    })()}
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
                <Input id="fechaEmision" name="fechaEmision" type="date" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fechaVencimiento">{t('facturaNueva.fechaVencimiento')}</Label>
                <Input id="fechaVencimiento" name="fechaVencimiento" type="date" />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="baseImponible">{t('facturaNueva.baseImponible')} ({MOEDAS.find(m => m.code === moneda)?.symbol ?? '€'})</Label>
                <Input id="baseImponible" name="baseImponible" type="number" step="0.01" required placeholder="100.00" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="iva">{t('facturaNueva.ivaPorcentaje')}</Label>
                <select
                  id="iva"
                  name="iva"
                  required
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
                <Input id="importeTotal" disabled placeholder={t('facturaNueva.seCalculaAuto')} />
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
                      const baseInput = document.getElementById('baseImponible') as HTMLInputElement | null
                      const base = parseFloat(baseInput?.value || '0')
                      const descuento = calcularDescuento(base, descuentoPorcentaje)
                      return `-${formatoMoneda(descuento / 100, moneda)}`
                    })()}
                  />
                </div>
              )}
            </div>

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}

            <div className="flex gap-4 pt-4">
              <Link href="/gestoria/facturas" className="flex-1">
                <Button variant="outline" type="button" className="w-full">
                  {t('facturaNueva.cancelar')}
                </Button>
              </Link>
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
            const input = formRef.current?.elements.namedItem(campo) as HTMLInputElement | null
            if (input && sugerencia) {
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
    </div>
  )
}
