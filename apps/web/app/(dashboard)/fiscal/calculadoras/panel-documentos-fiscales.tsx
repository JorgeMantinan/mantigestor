'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Upload, FileText, CheckCircle, AlertCircle, Loader2, Sparkles, Lock } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface DocumentoClasificado {
  tipo: 'nomina' | 'factura' | 'alquiler' | 'extracto_banco' | 'otro'
  confianza: number
  campos: Record<string, string | number | null>
  resumen: string
  nombreArchivo: string
  url: string
}

interface PanelDocumentosFiscalesProps {
  esPro: boolean
  onAplicarDatos?: (datos: Record<string, number>) => void
}

const TIPO_LABELS: Record<string, string> = {
  nomina: 'Nómina',
  factura: 'Factura',
  alquiler: 'Contrato/Recibo de alquiler',
  extracto_banco: 'Extracto bancario',
  otro: 'Otro documento',
}

const TIPO_COLORS: Record<string, string> = {
  nomina: 'text-blue-600 bg-blue-50',
  factura: 'text-green-600 bg-green-50',
  alquiler: 'text-purple-600 bg-purple-50',
  extracto_banco: 'text-orange-600 bg-orange-50',
  otro: 'text-gray-600 bg-gray-50',
}

export function PanelDocumentosFiscales({ esPro, onAplicarDatos }: PanelDocumentosFiscalesProps) {
  const [archivos, setArchivos] = useState<File[]>([])
  const [clasicados, setClasificados] = useState<DocumentoClasificado[]>([])
  const [procesando, setProcesando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setArchivos(Array.from(e.target.files))
      setError(null)
    }
  }

  const handleClasificar = async () => {
    if (!archivos.length || !esPro) return
    setProcesando(true)
    setError(null)

    const supabase = createClient()
    const resultados: DocumentoClasificado[] = []

    for (const archivo of archivos) {
      try {
        // Upload to Supabase Storage
        const fileName = `${crypto.randomUUID()}.${archivo.name.split('.').pop()}`
        const filePath = `fiscal/${fileName}`
        const { error: uploadError } = await supabase.storage.from('documentos').upload(filePath, archivo)
        if (uploadError) throw uploadError

        const { data: urlData } = supabase.storage.from('documentos').getPublicUrl(filePath)
        const publicUrl = urlData.publicUrl

        // Get user ID
        const { data: userData } = await supabase.auth.getUser()
        if (!userData.user) throw new Error('No autenticado')

        // Save document record
        await supabase.from('documentos').insert({
          id: crypto.randomUUID(),
          perfilId: userData.user.id,
          tipo: 'fiscal',
          nombre: archivo.name,
          tamanoBytes: archivo.size,
          url: publicUrl,
        })

        // Classify with AI
        const res = await fetch('/api/fiscal/clasificar-documento', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pdfUrl: publicUrl }),
        })

        if (!res.ok) {
          const err = await res.json()
          if (err.requierePro) {
            setError('La clasificación de documentos requiere Plan Pro')
            return
          }
          throw new Error(err.error || 'Error al clasificar')
        }

        const clasificacion = await res.json()
        resultados.push({
          ...clasificacion,
          nombreArchivo: archivo.name,
          url: publicUrl,
        })
      } catch (e) {
        console.error('Error procesando archivo:', e)
        setError(`Error con ${archivo.name}: ${e instanceof Error ? e.message : 'Error desconocido'}`)
      }
    }

    setClasificados(prev => [...prev, ...resultados])
    setArchivos([])
    setProcesando(false)
  }

  const handleAplicar = (doc: DocumentoClasificado) => {
    if (!onAplicarDatos || !doc.campos) return
    const datos: Record<string, number> = {}
    for (const [k, v] of Object.entries(doc.campos)) {
      if (typeof v === 'number') datos[k] = v
      else if (typeof v === 'string') {
        const n = parseFloat(v.replace(/[^0-9.,-]/g, '').replace(',', '.'))
        if (!isNaN(n)) datos[k] = n
      }
    }
    onAplicarDatos(datos)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-4 w-4" aria-hidden="true" />
          Documentos fiscales
        </CardTitle>
        <CardDescription>
          Sube nóminas, facturas o extractos y la IA los clasifica automáticamente para rellenar las casillas.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!esPro && (
          <div className="flex items-center gap-3 rounded-lg border border-amber-500/50 bg-amber-500/10 p-3 text-sm">
            <Lock className="h-4 w-4 shrink-0 text-amber-600" aria-hidden="true" />
            <div>
              <p className="font-medium">Función exclusiva del Plan Pro</p>
              <p className="text-muted-foreground">Actualiza tu plan para clasificar documentos con IA.</p>
            </div>
          </div>
        )}

        <div className="flex items-center gap-3">
          <label className={`flex items-center gap-2 rounded-md border px-4 py-2 text-sm cursor-pointer transition-colors ${esPro ? 'hover:bg-muted' : 'opacity-50 cursor-not-allowed'}`}>
            <Upload className="h-4 w-4" aria-hidden="true" />
            Seleccionar PDFs
            <input
              type="file"
              accept=".pdf"
              multiple
              onChange={handleFileChange}
              disabled={!esPro}
              className="sr-only"
            />
          </label>
          {archivos.length > 0 && (
            <Button
              type="button"
              size="sm"
              onClick={() => void handleClasificar()}
              disabled={procesando}
            >
              {procesando ? (
                <>
                  <Loader2 className="mr-1 h-3 w-3 animate-spin" aria-hidden="true" />
                  Clasificando...
                </>
              ) : (
                <>
                  <Sparkles className="mr-1 h-3 w-3" aria-hidden="true" />
                  Clasificar {archivos.length} archivo{archivos.length > 1 ? 's' : ''}
                </>
              )}
            </Button>
          )}
        </div>

        {archivos.length > 0 && (
          <ul className="text-sm text-muted-foreground space-y-1">
            {archivos.map((a, i) => (
              <li key={i} className="flex items-center gap-2">
                <FileText className="h-3 w-3" aria-hidden="true" />
                {a.name} ({(a.size / 1024).toFixed(0)} KB)
              </li>
            ))}
          </ul>
        )}

        {error && (
          <div className="flex items-center gap-2 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
            {error}
          </div>
        )}

        {clasicados.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Documentos clasificados:</p>
            {clasicados.map((doc, i) => (
              <div key={i} className="rounded-lg border p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" aria-hidden="true" />
                    <span className="text-sm font-medium">{doc.nombreArchivo}</span>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TIPO_COLORS[doc.tipo] ?? ''}`}>
                    {TIPO_LABELS[doc.tipo] ?? doc.tipo}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">{doc.resumen}</p>
                {Object.keys(doc.campos).length > 0 && (
                  <div className="flex flex-wrap gap-2 text-xs">
                    {Object.entries(doc.campos).map(([k, v]) => (
                      <span key={k} className="rounded bg-muted px-1.5 py-0.5">
                        {k}: {typeof v === 'number' ? v.toLocaleString('es-ES') : v ?? '—'}
                      </span>
                    ))}
                  </div>
                )}
                {onAplicarDatos && Object.keys(doc.campos).length > 0 && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => handleAplicar(doc)}
                    className="mt-1"
                  >
                    Aplicar datos a calculadora
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
