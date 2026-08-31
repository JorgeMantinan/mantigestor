'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { createClient } from '@/lib/supabase/client'
import { FileText, Image, Trash2, ExternalLink, Filter } from 'lucide-react'
import { toast } from 'sonner'

interface Documento {
  id: string
  tipo: string
  nombre: string
  tamanoBytes: number | null
  url: string
  subidoEn: string
}

const TIPO_LABELS: Record<string, string> = {
  factura: 'Factura',
  alumno: 'Alumno',
  trimestre: 'Trimestre',
  alquiler: 'Alquiler',
  nomina: 'Nómina',
}

const TIPO_COLORS: Record<string, string> = {
  factura: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  alumno: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
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
  const [documentos, setDocumentos] = useState<Documento[]>([])
  const [cargando, setCargando] = useState(true)
  const [filtroTipo, setFiltroTipo] = useState<string>('todos')
  const getSupabase = useCallback(() => createClient(), [])

  useEffect(() => {
    const cargar = async () => {
      const { data: { user } } = await getSupabase().auth.getUser()
      if (!user) { setCargando(false); return }

      const { data } = await getSupabase()
        .from('documentos')
        .select('*')
        .eq('perfilId', user.id)
        .order('subidoEn', { ascending: false })

      if (data) setDocumentos(data as Documento[])
      setCargando(false)
    }
    cargar()
  }, [getSupabase])

  const eliminar = async (doc: Documento) => {
    await getSupabase().from('documentos').delete().eq('id', doc.id)
    setDocumentos(prev => prev.filter(d => d.id !== doc.id))
    toast.success('Documento eliminado')
  }

  const tipos = [...new Set(documentos.map(d => d.tipo))]
  const filtrados = filtroTipo === 'todos' ? documentos : documentos.filter(d => d.tipo === filtroTipo)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Documentos</h1>
        <p className="text-muted-foreground">Galería de recibos, facturas y documentos subidos</p>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <Button
          variant={filtroTipo === 'todos' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFiltroTipo('todos')}
        >
          Todos ({documentos.length})
        </Button>
        {tipos.map(t => (
          <Button
            key={t}
            variant={filtroTipo === t ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFiltroTipo(t)}
          >
            {TIPO_LABELS[t] ?? t} ({documentos.filter(d => d.tipo === t).length})
          </Button>
        ))}
      </div>

      {cargando ? (
        <p className="text-sm text-muted-foreground">Cargando documentos...</p>
      ) : filtrados.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No hay documentos{filtroTipo !== 'todos' ? ` de tipo "${TIPO_LABELS[filtroTipo]}"` : ''}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtrados.map(doc => (
            <Card key={doc.id} className="overflow-hidden hover:shadow-md transition-shadow">
              <div className="aspect-video bg-muted flex items-center justify-center">
                {esImagen(doc.nombre) ? (
                  <img src={doc.url} alt={doc.nombre} className="w-full h-full object-cover" />
                ) : (
                  <FileText className="h-12 w-12 text-muted-foreground/50" />
                )}
              </div>
              <CardContent className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{doc.nombre}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge className={`text-xs ${TIPO_COLORS[doc.tipo] ?? ''}`}>
                        {TIPO_LABELS[doc.tipo] ?? doc.tipo}
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
                    <a href={doc.url} target="_blank" rel="noopener noreferrer">
                      <Button variant="ghost" size="sm">
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    </a>
                    <Button variant="ghost" size="sm" onClick={() => void eliminar(doc)}>
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
