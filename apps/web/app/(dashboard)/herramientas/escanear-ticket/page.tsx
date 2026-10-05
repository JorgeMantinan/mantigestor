'use client'

import { useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { usePersonaActiva } from '@/contexts/persona-activa-context'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Camera, Upload, CheckCircle, RotateCcw, Loader2, FileText, Euro, Calendar, Tag } from 'lucide-react'

interface TicketData {
  fecha: string
  concepto: string
  baseImponible: number
  iva: number
  ivaPorcentaje: number
  total: number
  proveedor: string
}

function formatEuro(v: number): string {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(v)
}

async function extraerDatosOCR(imagenBase64: string): Promise<TicketData> {
  const res = await fetch('/api/ocr-image', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image: imagenBase64 }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || 'Error al procesar la imagen')
  }
  const data = await res.json()
  const base = typeof data.baseImponible === 'number' ? data.baseImponible : 0
  const ivaPorcentaje = typeof data.iva === 'number' && [0, 4, 10, 21].includes(data.iva) ? data.iva : 21
  const total = typeof data.total === 'number' && data.total > 0
    ? data.total
    : Math.round((base * (1 + ivaPorcentaje / 100)) * 100) / 100
  const iva = Math.round((total - base) * 100) / 100
  return {
    fecha: data.fechaEmision || new Date().toISOString().slice(0, 10),
    concepto: data.emisorReceptor || data.numero || 'Ticket',
    baseImponible: base,
    iva,
    ivaPorcentaje,
    total,
    proveedor: data.emisorReceptor || '',
  }
}

export default function EscanearTicketPage() {
  const router = useRouter()
  const { perfilActivoId } = usePersonaActiva()
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [modo, setModo] = useState<'idle' | 'camera' | 'capturing' | 'preview' | 'result'>('idle')
  const [datos, setDatos] = useState<TicketData | null>(null)
  const [imagenCapturada, setImagenCapturada] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [guardado, setGuardado] = useState(false)

  const iniciarCamara = useCallback(async () => {
    setError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } }
      })
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      setModo('camera')
    } catch {
      setError('No se pudo acceder a la cámara. Verifica los permisos del navegador.')
    }
  }, [])

  const capturarFoto = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return
    setModo('capturing')

    const video = videoRef.current
    const canvas = canvasRef.current
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.drawImage(video, 0, 0)
    const imagenBase64 = canvas.toDataURL('image/jpeg', 0.8)
    setImagenCapturada(imagenBase64)

    // Stop camera
    const stream = video.srcObject as MediaStream
    stream?.getTracks().forEach(t => t.stop())

    try {
      const ticketData = await extraerDatosOCR(imagenBase64)
      setDatos(ticketData)
      setModo('preview')
    } catch {
      setError('Error al procesar la imagen. Intenta de nuevo.')
      setModo('camera')
    }
  }, [])

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 5 * 1024 * 1024) {
      setError('La imagen supera el tamaño máximo de 5MB')
      e.target.value = ''
      return
    }
    if (file.type && !['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) {
      setError('Formato no soportado. Usa JPG, PNG, WebP o GIF')
      e.target.value = ''
      return
    }

    setError(null)
    setModo('capturing')

    const reader = new FileReader()
    reader.onload = async (ev) => {
      const imagenBase64 = ev.target?.result as string
      setImagenCapturada(imagenBase64)

      try {
        const ticketData = await extraerDatosOCR(imagenBase64)
        setDatos(ticketData)
        setModo('preview')
      } catch {
        setError('Error al procesar la imagen. Intenta de nuevo.')
        setModo('idle')
      }
    }
    reader.readAsDataURL(file)
  }, [])

  const guardarFactura = async () => {
    if (!datos) return
    setGuardando(true)
    setError(null)

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No hay sesión iniciada')

      const baseImponible = Math.round(datos.baseImponible * 100)
      const total = Math.round(datos.total * 100)
      const { error: insertError } = await supabase.from('facturas').insert({
        id: crypto.randomUUID(),
        perfilId: perfilActivoId ?? user.id,
        numero: `TICKET-${Date.now()}`,
        tipo: 'gasto',
        emisorReceptor: datos.proveedor || datos.concepto,
        nifContraparte: '',
        fechaEmision: datos.fecha,
        fechaVencimiento: null,
        baseImponible,
        iva: datos.ivaPorcentaje,
        total,
        estado: 'pendiente',
        categoriaGasto: 'otros',
        notas: datos.concepto,
        moneda: 'EUR',
        tipoCambio: 1,
        descuentoPorcentaje: 0,
      })
      if (insertError) throw new Error(insertError.message)

      setGuardado(true)
      setModo('result')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al guardar la factura')
    } finally {
      setGuardando(false)
    }
  }

  const reiniciar = () => {
    setModo('idle')
    setDatos(null)
    setImagenCapturada(null)
    setError(null)
    setGuardado(false)
    setGuardando(false)
  }

  const actualizarCampo = (campo: keyof TicketData, valor: string | number) => {
    if (!datos) return
    const nuevos = { ...datos, [campo]: valor }

    // Recalcular IVA si cambia base o porcentaje
    if (campo === 'baseImponible' || campo === 'ivaPorcentaje') {
      const base = campo === 'baseImponible' ? Number(valor) : datos.baseImponible
      const porcentaje = campo === 'ivaPorcentaje' ? Number(valor) : datos.ivaPorcentaje
      nuevos.iva = Math.round(base * (porcentaje / 100) * 100) / 100
      nuevos.total = Math.round((base + nuevos.iva) * 100) / 100
    }
    if (campo === 'total' && datos.ivaPorcentaje > 0) {
      const total = Number(valor)
      nuevos.baseImponible = Math.round((total / (1 + datos.ivaPorcentaje / 100)) * 100) / 100
      nuevos.iva = Math.round((total - nuevos.baseImponible) * 100) / 100
    }

    setDatos(nuevos)
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Escanear ticket con cámara</h1>
        <p className="text-muted-foreground">
          Usa la cámara de tu dispositivo para capturar un ticket y extraer los datos automáticamente
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm dark:bg-red-950 dark:border-red-800">
          <p className="text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      {/* Idle state: choose input method */}
      {modo === 'idle' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5" />
              Selecciona método de captura
            </CardTitle>
            <CardDescription>
              Toma una foto del ticket o sube una imagen
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={iniciarCamara} className="w-full" size="lg">
              <Camera className="mr-2 h-5 w-5" />
              Abrir cámara
            </Button>
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">o</span>
              </div>
            </div>
            <div>
              <label htmlFor="file-upload">
                <Button variant="outline" className="w-full" size="lg" asChild>
                  <span>
                    <Upload className="mr-2 h-5 w-5" />
                    Subir imagen del ticket
                  </span>
                </Button>
              </label>
              <input
                id="file-upload"
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handleFileUpload}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Camera mode */}
      {(modo === 'camera' || modo === 'capturing') && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5" />
              Cámara activa
            </CardTitle>
            <CardDescription>
              Encuadra el ticket y pulsa capturar
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative rounded-lg overflow-hidden bg-black">
              <video
                ref={videoRef}
                className="w-full max-h-[400px] object-contain"
                playsInline
                muted
              />
              <div className="absolute inset-0 border-2 border-dashed border-white/30 rounded-lg pointer-events-none" />
            </div>
            <canvas ref={canvasRef} className="hidden" />
            <div className="flex gap-2">
              <Button
                onClick={capturarFoto}
                disabled={modo === 'capturing'}
                className="flex-1"
              >
                {modo === 'capturing' ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Camera className="mr-2 h-4 w-4" />
                )}
                {modo === 'capturing' ? 'Procesando...' : 'Capturar'}
              </Button>
              <Button variant="outline" onClick={() => {
                const stream = videoRef.current?.srcObject as MediaStream
                stream?.getTracks().forEach(t => t.stop())
                reiniciar()
              }}>
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Preview with editable data */}
      {modo === 'preview' && datos && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Datos extraídos
            </CardTitle>
            <CardDescription>
              Revisa y corrige los datos antes de guardar
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {imagenCapturada && (
              <div className="rounded-lg overflow-hidden border">
                {/* eslint-disable-next-line @next/next/no-img-element -- preview de contenido de usuario (data:/blob) sin dimensiones fijas */}
                <img
                  src={imagenCapturada}
                  alt="Ticket capturado"
                  className="w-full max-h-[200px] object-contain"
                />
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" /> Fecha
                </Label>
                <Input
                  type="date"
                  value={datos.fecha}
                  onChange={e => actualizarCampo('fecha', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  <Tag className="h-3.5 w-3.5" /> Proveedor
                </Label>
                <Input
                  value={datos.proveedor}
                  onChange={e => actualizarCampo('proveedor', e.target.value)}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Concepto</Label>
                <Input
                  value={datos.concepto}
                  onChange={e => actualizarCampo('concepto', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  <Euro className="h-3.5 w-3.5" /> Base imponible
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={datos.baseImponible}
                  onChange={e => actualizarCampo('baseImponible', parseFloat(e.target.value) || 0)}
                />
              </div>
              <div className="space-y-2">
                <Label>IVA (%)</Label>
                <select
                  value={datos.ivaPorcentaje}
                  onChange={e => actualizarCampo('ivaPorcentaje', parseInt(e.target.value))}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value={21}>21%</option>
                  <option value={10}>10%</option>
                  <option value={4}>4%</option>
                  <option value={0}>0%</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>IVA (€)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={datos.iva}
                  readOnly
                  className="bg-muted"
                />
              </div>
              <div className="space-y-2">
                <Label className="font-bold">Total</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={datos.total}
                  onChange={e => actualizarCampo('total', parseFloat(e.target.value) || 0)}
                  className="font-bold"
                />
              </div>
            </div>

            <div className="rounded-lg bg-muted/30 p-3 text-sm">
              <p className="font-medium">Resumen:</p>
              <p className="text-muted-foreground">
                {datos.proveedor} · {datos.fecha} · Base: {formatEuro(datos.baseImponible)} + IVA {datos.ivaPorcentaje}% ({formatEuro(datos.iva)}) = <strong>{formatEuro(datos.total)}</strong>
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={guardarFactura}
                disabled={guardando || !datos.concepto}
                className="flex-1"
              >
                {guardando ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle className="mr-2 h-4 w-4" />
                )}
                {guardando ? 'Guardando...' : 'Guardar como factura recibida'}
              </Button>
              <Button variant="outline" onClick={reiniciar}>
                <RotateCcw className="mr-2 h-4 w-4" />
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Result */}
      {modo === 'result' && guardado && datos && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="rounded-full bg-green-100 p-3 dark:bg-green-900">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold">Factura guardada</h3>
                <p className="text-muted-foreground">
                  {datos.proveedor} · {formatEuro(datos.total)}
                </p>
              </div>
              <div className="flex gap-2">
                <Button onClick={reiniciar}>
                  <Camera className="mr-2 h-4 w-4" />
                  Escanear otro ticket
                </Button>
                <Button variant="outline" onClick={() => router.push('/gestoria/facturas')}>
                  <FileText className="mr-2 h-4 w-4" />
                  Ver facturas
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
