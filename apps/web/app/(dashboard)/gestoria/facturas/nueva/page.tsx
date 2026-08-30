'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { ChevronLeft, ScanLine, Loader2, Lightbulb } from 'lucide-react'
import { CategoriaGastoPicker } from '@/components/facturas/categoria-gasto-picker'
import { FileUpload } from '@/components/upload/FileUpload'
import Link from 'next/link'
import type { OcrResult, ModeloSugeridoOcr } from '@/lib/ocr'
import { useSpeechRecognition } from '@/hooks/use-speech-recognition'
import { useParsearVoz } from '@/hooks/use-parsear-voz'
import { rellenarFormularioDesdeOcr } from '@/lib/factura-utils'
import { VoiceInput } from '@/components/facturas/voice-input'

const TIPOS_IVA = [21, 10, 4, 0] as const

export default function NuevaFacturaPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [escanendo, setEscanendo] = useState(false)
  const [modelosSugeridos, setModelosSugeridos] = useState<ModeloSugeridoOcr[]>([])
  const [categoriaGasto, setCategoriaGasto] = useState<string | null>(null)
  const [tipoSeleccionado, setTipoSeleccionado] = useState<string>('ingreso')

  const formRef = useRef<HTMLFormElement>(null)
  const speech = useSpeechRecognition()
  const { parseandoVoz, parsearVoz } = useParsearVoz({ formRef })

  const getSupabase = useCallback(() => createClient(), [])

  useEffect(() => {
    getSupabase().auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null))
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
        setError(err.error || 'Error al escanear la factura')
        return
      }
      const data: OcrResult = await res.json()
      setModelosSugeridos(data.modelosSugeridos ?? [])
      rellenarFormularioDesdeOcr(formRef, data)
    } catch {
      setError('Error al conectar con el servicio de OCR')
    }
    setEscanendo(false)
  }

  function handleParsearVoz() {
    void parsearVoz(speech.transcripcion, setError)
    speech.limpiar()
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
      setError('El número de factura es obligatorio')
      setLoading(false)
      return
    }

    if (!emisorReceptor) {
      setError('El nombre del cliente o proveedor es obligatorio')
      setLoading(false)
      return
    }

    if (isNaN(baseImponible) || baseImponible <= 0) {
      setError('La base imponible debe ser un importe positivo')
      setLoading(false)
      return
    }

    if (![0, 4, 10, 21].includes(iva)) {
      setError('El IVA debe ser 0, 4, 10 o 21')
      setLoading(false)
      return
    }

    const importeIva = Math.round(baseImponible * (iva / 100))
    const total = baseImponible + importeIva

    const { data: { user } } = await getSupabase().auth.getUser()
    if (!user) {
      setError('No has iniciado sesión')
      setLoading(false)
      return
    }

    const { error: insertError } = await getSupabase().from('facturas').insert({
      id: crypto.randomUUID(),
      perfilId: user.id,
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
      pdfUrl: pdfUrl || null,
    })

    if (insertError) {
      setError(insertError.message)
      setLoading(false)
      return
    }

    router.push('/gestoria/facturas')
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/gestoria/facturas">
          <Button variant="ghost" size="icon" aria-label="Volver a facturas">
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-heading font-bold tracking-tight">Nueva factura</h1>
          <p className="text-muted-foreground">Introduce los datos de la factura</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Datos de la factura</CardTitle>
          <CardDescription>Rellena todos los campos obligatorios</CardDescription>
        </CardHeader>
        <CardContent>
          <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="tipo">Tipo</Label>
                <select
                  id="tipo"
                  name="tipo"
                  required
                  value={tipoSeleccionado}
                  onChange={e => { setTipoSeleccionado(e.target.value); if (e.target.value !== 'gasto') setCategoriaGasto(null) }}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <option value="ingreso">Ingreso (emitida)</option>
                  <option value="gasto">Gasto (recibida)</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="numero">Nº factura</Label>
                <Input id="numero" name="numero" required placeholder="F-2024-001" />
              </div>
            </div>

            {tipoSeleccionado === 'gasto' && (
              <div className="space-y-2">
                <Label>Categoría del gasto</Label>
                <CategoriaGastoPicker value={categoriaGasto} onChange={setCategoriaGasto} />
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="emisorReceptor">Nombre/cliente o proveedor</Label>
                <Input id="emisorReceptor" name="emisorReceptor" required placeholder="Nombre" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nifContraparte">NIF/CIF</Label>
                <Input id="nifContraparte" name="nifContraparte" placeholder="12345678Z" />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="fechaEmision">Fecha de emisión</Label>
                <Input id="fechaEmision" name="fechaEmision" type="date" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fechaVencimiento">Fecha de vencimiento</Label>
                <Input id="fechaVencimiento" name="fechaVencimiento" type="date" />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="baseImponible">Base imponible (€)</Label>
                <Input id="baseImponible" name="baseImponible" type="number" step="0.01" required placeholder="100.00" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="iva">IVA (%)</Label>
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
                <Label htmlFor="importeTotal">Total (€)</Label>
                <Input id="importeTotal" disabled placeholder="Se calcula automáticamente" />
              </div>
            </div>

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}

            <div className="flex gap-4 pt-4">
              <Link href="/gestoria/facturas" className="flex-1">
                <Button variant="outline" type="button" className="w-full">
                  Cancelar
                </Button>
              </Link>
              <Button type="submit" disabled={loading} className="flex-1">
                {loading ? 'Guardando...' : 'Crear factura'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Entrada por voz</CardTitle>
          <CardDescription>
            Describe la factura con el microfono y auto-rellena los campos
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
          <CardTitle>Documento adjunto</CardTitle>
          <CardDescription>Sube el PDF de la factura (opcional)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <FileUpload
            bucket="documentos"
            path={userId ?? ''}
            tipo="factura"
            accept=".pdf"
            buttonText="Subir factura PDF"
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
              {escanendo ? 'Escaneando...' : 'Escanear factura con IA'}
            </Button>
          )}
        </CardContent>
      </Card>

      {modelosSugeridos.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-yellow-500" aria-hidden="true" />
              Modelos fiscales afectados
            </CardTitle>
            <CardDescription>Esta factura afecta a los siguientes modelos de la AEAT</CardDescription>
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
                      Abrir
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
