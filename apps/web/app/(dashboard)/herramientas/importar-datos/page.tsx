'use client'

import { useState, useRef, useCallback, type ChangeEvent } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { toast, Toaster } from 'sonner'
import { Upload, FileText, Loader2, AlertCircle, CheckCircle2, Table2, ArrowRight } from 'lucide-react'
import { usePersonaActiva } from '@/contexts/persona-activa-context'
import {
  parsearArchivoImportacion,
  ORIGENES_IMPORTACION,
  type FilaFacturaImportable,
  type OrigenImportacion,
} from '@/lib/importar-datos'

type OrigenSeleccion = 'auto' | OrigenImportacion

function formatMoney(cents: number): string {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(cents / 100)
}

export default function ImportarDatosPage() {
  const [file, setFile] = useState<File | null>(null)
  const [origen, setOrigen] = useState<OrigenSeleccion>('auto')
  const [resultado, setResultado] = useState<{
    origen: OrigenImportacion
    facturas: FilaFacturaImportable[]
    errores: string[]
  } | null>(null)
  const [leyendo, setLeyendo] = useState(false)
  const [importando, setImportando] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const { perfilActivoId } = usePersonaActiva()

  const getSupabase = useCallback(() => createClient(), [])

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0] ?? null
    setResultado(null)
    setFile(selected)
  }

  const leerArchivo = async () => {
    if (!file) {
      toast.error('Selecciona un archivo CSV o Excel primero')
      return
    }
    setLeyendo(true)
    setResultado(null)
    try {
      const res = await parsearArchivoImportacion(file, origen === 'auto' ? undefined : origen)
      setResultado(res)
      if (res.facturas.length === 0) {
        toast.error(res.errores[0] ?? 'No se pudieron leer filas de facturas del archivo')
      } else {
        toast.success(`${res.facturas.length} fila${res.facturas.length !== 1 ? 's' : ''} leída${res.facturas.length !== 1 ? 's' : ''}`)
        if (res.errores.length > 0) {
          for (const err of res.errores) toast.warning(err)
        }
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo leer el archivo')
    } finally {
      setLeyendo(false)
    }
  }

  const importar = async () => {
    if (!resultado || resultado.facturas.length === 0) return
    setImportando(true)
    try {
      const { data: { user } } = await getSupabase().auth.getUser()
      if (!user) {
        toast.error('Debes iniciar sesión para importar facturas')
        return
      }

      const perfilId = perfilActivoId ?? user.id
      const now = new Date().toISOString()

      const inserts = resultado.facturas.map((f, i) => ({
        id: crypto.randomUUID(),
        perfilId,
        numero: f.numero.trim() || `IMP-${Date.now()}-${i + 1}`,
        tipo: f.tipo,
        emisorReceptor: f.emisorReceptor,
        nifContraparte: f.nifContraparte,
        fechaEmision: f.fechaEmision,
        baseImponible: f.baseImponible,
        iva: f.iva,
        total: f.total,
        estado: f.estado,
        categoriaGasto: f.categoriaGasto,
        moneda: 'EUR',
        tipoCambio: 1,
        descuentoPorcentaje: 0,
        createdAt: now,
      }))

      const { error } = await getSupabase().from('facturas').insert(inserts)
      if (error) throw error

      toast.success(`${inserts.length} factura${inserts.length !== 1 ? 's' : ''} importada${inserts.length !== 1 ? 's' : ''}`, {
        description: 'Ya aparecen en tu listado de facturas.',
      })
      setResultado(null)
      setFile(null)
      if (inputRef.current) inputRef.current.value = ''
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al importar las facturas')
    } finally {
      setImportando(false)
    }
  }

  const previsualizar = resultado?.facturas.slice(0, 50) ?? []
  const origenDetectado = resultado
    ? ORIGENES_IMPORTACION.find(o => o.id === resultado.origen)?.nombre
    : null

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-3xl font-heading font-bold tracking-tight">Importar datos de la competencia</h1>
        <p className="text-muted-foreground">
          Sube un CSV o Excel exportado desde Quipu, Holded, ContaPlus (SAGE.csv) o un fichero genérico y
          conviértelo en facturas de MantiGestor.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-primary" aria-hidden="true" />
            Seleccionar archivo y origen
          </CardTitle>
          <CardDescription>
            Formatos admitidos: .csv, .xlsx, .xls. Detectamos las columnas automáticamente, pero puedes indicar
            el origen para mejorar el mapeo.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="origen-import">Origen</Label>
              <select
                id="origen-import"
                value={origen}
                onChange={e => setOrigen(e.target.value as OrigenSeleccion)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="auto">Auto-detectar origen</option>
                {ORIGENES_IMPORTACION.map(o => (
                  <option key={o.id} value={o.id}>
                    {o.nombre} — {o.descripcion}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="archivo-import">Archivo</Label>
              <input
                id="archivo-import"
                ref={inputRef}
                type="file"
                accept=".csv,.txt,.xlsx,.xls"
                onChange={handleFileChange}
                className="flex h-10 w-full cursor-pointer items-center rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground file:mr-3 file:rounded file:border-0 file:bg-primary file:px-3 file:py-1 file:text-xs file:font-medium file:text-primary-foreground file:hover:bg-primary/90"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={() => void leerArchivo()} disabled={!file || leyendo}>
              {leyendo ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                  Leyendo...
                </>
              ) : (
                <>
                  <FileText className="mr-2 h-4 w-4" aria-hidden="true" />
                  Previsualizar datos
                </>
              )}
            </Button>
            {file && (
              <p className="text-xs text-muted-foreground">
                {file.name} · {(file.size / 1024).toFixed(1)} KB
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {resultado && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Table2 className="h-5 w-5 text-primary" aria-hidden="true" />
              Vista previa
              {origenDetectado && (
                <span className="ml-2 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                  {origenDetectado}
                </span>
              )}
            </CardTitle>
            <CardDescription>
              {resultado.facturas.length > 0
                ? `${resultado.facturas.length} facturas listas para importar${resultado.facturas.length > 50 ? ' (mostrando las primeras 50)' : ''}.`
                : 'No se ha detectado ninguna factura válida en el archivo.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {resultado.errores.length > 0 && (
              <div className="space-y-1">
                {resultado.errores.map((err, i) => (
                  <p key={i} className="flex items-start gap-2 text-sm text-amber-600 dark:text-amber-400">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                    {err}
                  </p>
                ))}
              </div>
            )}

            {previsualizar.length > 0 && (
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="px-3 py-2 text-left font-medium">Número</th>
                      <th className="px-3 py-2 text-left font-medium">Tipo</th>
                      <th className="px-3 py-2 text-left font-medium">Contraparte</th>
                      <th className="px-3 py-2 text-left font-medium">Fecha</th>
                      <th className="px-3 py-2 text-right font-medium">Base</th>
                      <th className="px-3 py-2 text-right font-medium">IVA</th>
                      <th className="px-3 py-2 text-right font-medium">Total</th>
                      <th className="px-3 py-2 text-left font-medium">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previsualizar.map((f, i) => (
                      <tr key={i} className="border-b last:border-0 hover:bg-muted/30">
                        <td className="px-3 py-2 font-medium">{f.numero || '—'}</td>
                        <td className="px-3 py-2">
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${f.tipo === 'ingreso' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300'}`}>
                            {f.tipo === 'ingreso' ? 'Ingreso' : 'Gasto'}
                          </span>
                        </td>
                        <td className="px-3 py-2">{f.emisorReceptor}</td>
                        <td className="px-3 py-2">{f.fechaEmision}</td>
                        <td className="px-3 py-2 text-right">{formatMoney(f.baseImponible)}</td>
                        <td className="px-3 py-2 text-right">{f.iva}%</td>
                        <td className="px-3 py-2 text-right font-medium">{formatMoney(f.total)}</td>
                        <td className="px-3 py-2">{f.estado}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <Button onClick={() => void importar()} disabled={importando || resultado.facturas.length === 0}>
              {importando ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                  Importando...
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" aria-hidden="true" />
                  Importar {resultado.facturas.length} factura{resultado.facturas.length !== 1 ? 's' : ''}
                  <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}
      <Toaster richColors position="top-right" />
    </div>
  )
}
