'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { createClient } from '@/lib/supabase/client'
import { FileText, Trash2, ExternalLink, ScanSearch } from 'lucide-react'
import Image from 'next/image'
import { toast } from 'sonner'
import { OcrBatchResults, type ResultadoOcrLote } from '@/components/ocr-batch-results'
import { useLanguage } from '@/contexts/language-context'
import { useEmpresaActiva } from '@/contexts/empresa-activa-context'
import { usePersonaActiva } from '@/contexts/persona-activa-context'
import { esSoloLectura } from '@/lib/resolve-perfil-activo'
import { firmarUrlsStorage } from '@/lib/storage'

interface Documento {
  id: string
  tipo: string
  nombre: string
  tamanoBytes: number | null
  url: string
  subidoEn: string
}


const TIPO_COLORS: Record<string, string> = {
  factura: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  trimestre: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  alquiler: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  nomina: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
}

function formatTamano(bytes: number | null): string {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function esImagen(nombre: string): boolean {
  return /\.(jpg|jpeg|png|gif|webp|heic|heif)$/i.test(nombre)
}

export default function DocumentosPage() {
  const { t } = useLanguage()
  const [documentos, setDocumentos] = useState<Documento[]>([])
  const [cargando, setCargando] = useState(true)
  const [filtroTipo, setFiltroTipo] = useState<string>('todos')
  const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set())
  const [procesandoLote, setProcesandoLote] = useState(false)
  const [progresoLote, setProgresoLote] = useState<{ actual: number; total: number } | null>(null)
  const [resultadosLote, setResultadosLote] = useState<ResultadoOcrLote[] | null>(null)
  const [dialogAbierto, setDialogAbierto] = useState(false)
  const getSupabase = useCallback(() => createClient(), [])
  const { empresaActiva } = useEmpresaActiva()
  const { perfilActivoId, personas, esPropio } = usePersonaActiva()
  const personaActiva = personas.find(p => p.perfilId === perfilActivoId)
  const soloLectura = !esPropio && personaActiva && esSoloLectura(personaActiva.rol)

  const tipoLabel = useCallback((tipo: string) => {
    const key = `documentosTipo.${tipo}` as 'documentosTipo.factura'
    return t(key) || tipo
  }, [t])

  useEffect(() => {
    const cargar = async () => {
      const { data: { user } } = await getSupabase().auth.getUser()
      if (!user) { setCargando(false); return }

      let perfilId = perfilActivoId
      if (!perfilId) {
        const { data: perfil } = await getSupabase().from('perfiles').select('id').eq('userId', user.id).single()
        if (!perfil) { setCargando(false); return }
        perfilId = perfil.id
      }

      let query = getSupabase()
        .from('documentos')
        .select('*')
        .eq('perfilId', perfilId)
        .order('subidoEn', { ascending: false })
        .limit(500)
      if (empresaActiva?.id) {
        query = query.eq('empresaId', empresaActiva.id)
      }

      const { data } = await query

      if (data) {
        const docs = data as Documento[]
        // Bucket privado: firmar las URLs para mostrarlas (caducan en 1h)
        const urlsFirmadas = await firmarUrlsStorage(docs.map(d => d.url))
        setDocumentos(docs.map((d, i) => ({ ...d, url: (urlsFirmadas[i] as string) ?? d.url })))
      }
      setCargando(false)
    }
    cargar()
  }, [getSupabase, empresaActiva?.id, perfilActivoId])

  const eliminar = async (doc: Documento) => {
    await getSupabase().from('documentos').delete().eq('id', doc.id)
    setDocumentos(prev => prev.filter(d => d.id !== doc.id))
    setSeleccionados(prev => { const s = new Set(prev); s.delete(doc.id); return s })
    toast.success(t('documentos.documentoEliminado'))
  }

  const toggleSeleccion = (id: string) => {
    setSeleccionados(prev => {
      const s = new Set(prev)
      if (s.has(id)) s.delete(id)
      else s.add(id)
      return s
    })
  }

  const toggleSeleccionTodos = () => {
    if (seleccionados.size === filtrados.length) {
      setSeleccionados(new Set())
    } else {
      setSeleccionados(new Set(filtrados.map(d => d.id)))
    }
  }

  const procesarLote = async () => {
    const docsSeleccionados = documentos.filter(d => seleccionados.has(d.id))
    if (docsSeleccionados.length === 0) return

    setProcesandoLote(true)
    setProgresoLote({ actual: 0, total: docsSeleccionados.length })
    setResultadosLote(null)
    setDialogAbierto(true)

    try {
      const archivos = docsSeleccionados.map(d => ({ url: d.url, nombre: d.nombre }))

      const res = await fetch('/api/ocr-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ archivos }),
      })

      if (!res.ok) {
        const err = await res.json()
        toast.error(err.error ?? t('documentos.errorProcesarLote'))
        setDialogAbierto(false)
        return
      }

      const data = await res.json()
      setResultadosLote(data.resultados)
      setProgresoLote(null)

      const exitosos = data.resultados.filter((r: ResultadoOcrLote) => r.resultado).length
      const errores = data.resultados.filter((r: ResultadoOcrLote) => r.error).length
      toast.success(`${t('documentos.ocrCompletado')}: ${exitosos} ${t('documentos.exitosos')}, ${errores} ${t('documentos.errores')}`)
    } catch {
      toast.error(t('documentos.errorConexion'))
      setDialogAbierto(false)
    } finally {
      setProcesandoLote(false)
    }
  }

  const tipos = [...new Set(documentos.map(d => d.tipo))]
  const filtrados = filtroTipo === 'todos' ? documentos : documentos.filter(d => d.tipo === filtroTipo)
  const haySeleccion = seleccionados.size > 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t('documentos.titulo')}</h1>
        <p className="text-muted-foreground">{t('documentosPage.galeriaRecibos')}</p>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <Button
          variant={filtroTipo === 'todos' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFiltroTipo('todos')}
        >
          {t('documentos.todos')} ({documentos.length})
        </Button>
        {tipos.map(t => (
          <Button
            key={t}
            variant={filtroTipo === t ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFiltroTipo(t)}
          >
            {tipoLabel(t)} ({documentos.filter(d => d.tipo === t).length})
          </Button>
        ))}
      </div>

      {filtrados.length > 0 && (
        <div className="flex items-center gap-3">
          <Checkbox
            checked={seleccionados.size === filtrados.length && filtrados.length > 0}
            onCheckedChange={toggleSeleccionTodos}
          />
          <span className="text-sm text-muted-foreground">
            {seleccionados.size > 0 ? `${seleccionados.size} ${t('documentos.seleccionados')}` : t('documentos.seleccionarTodos')}
          </span>
          {haySeleccion && !soloLectura && (
            <Button
              size="sm"
              onClick={() => void procesarLote()}
              disabled={procesandoLote}
            >
              <ScanSearch className="h-4 w-4 mr-1" />
              {procesandoLote ? t('documentos.procesando') : `${t('documentos.ocrLote')} (${seleccionados.size})`}
            </Button>
          )}
        </div>
      )}

      {cargando ? (
        <p className="text-sm text-muted-foreground">{t('documentos.cargandoDocumentos')}</p>
      ) : filtrados.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>{t('documentos.sinDocumentos')}{filtroTipo !== 'todos' ? ` ${t('documentosPage.sinDocumentosTipo')} "${tipoLabel(filtroTipo)}"` : ''}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtrados.map(doc => (
            <Card key={doc.id} className="overflow-hidden hover:shadow-md transition-shadow">
              <div className="aspect-video bg-muted flex items-center justify-center relative">
                {esImagen(doc.nombre) ? (
                  <Image src={doc.url} alt={doc.nombre} fill className="object-cover" sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" />
                ) : (
                  <FileText className="h-12 w-12 text-muted-foreground/50" />
                )}
                <div className="absolute top-2 left-2">
                  <Checkbox
                    checked={seleccionados.has(doc.id)}
                    onCheckedChange={() => toggleSeleccion(doc.id)}
                  />
                </div>
              </div>
              <CardContent className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{doc.nombre}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge className={`text-xs ${TIPO_COLORS[doc.tipo] ?? ''}`}>
                        {tipoLabel(doc.tipo)}
                      </Badge>
                      {doc.tamanoBytes && (
                        <span className="text-xs text-muted-foreground">{formatTamano(doc.tamanoBytes)}</span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(doc.subidoEn).toLocaleDateString('es-ES')}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <a href={/^https:\/\//i.test(doc.url) ? doc.url : '#'} target="_blank" rel="noopener noreferrer">
                      <Button variant="ghost" size="sm">
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    </a>
                    {!soloLectura && (
                      <Button variant="ghost" size="sm" onClick={() => void eliminar(doc)}>
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogAbierto} onOpenChange={setDialogAbierto}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('documentos.dialogOcrLote')}</DialogTitle>
            <DialogDescription>
              {progresoLote
                ? `${t('documentos.procesandoArchivo')} ${progresoLote.actual} ${t('documentosPage.de')} ${progresoLote.total}...`
                : t('documentos.resultadosProcesamiento')
              }
            </DialogDescription>
          </DialogHeader>
          {progresoLote && (
            <div className="space-y-2">
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${(progresoLote.actual / progresoLote.total) * 100}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground text-center">
                {progresoLote.actual} / {progresoLote.total}
              </p>
            </div>
          )}
          {resultadosLote && <OcrBatchResults resultados={resultadosLote} />}
        </DialogContent>
      </Dialog>
    </div>
  )
}
