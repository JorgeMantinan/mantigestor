'use client'

import { useState, useCallback, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { FileText, GraduationCap, Trash2, ArrowUpRight } from 'lucide-react'
import Link from 'next/link'
import { FileUpload } from '@/components/upload/FileUpload'

interface Documento {
  id: string
  nombre: string
  tipoArchivo: string
  tamañoBytes: number | null
  creadoEn: string
}

export default function AlumnosPage() {
  const [documentos, setDocumentos] = useState<Documento[]>([])
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)

  const getSupabase = useCallback(() => createClient(), [])

  const fetchDocumentos = useCallback(async () => {
    const { data: { user } } = await getSupabase().auth.getUser()
    if (!user) { setLoading(false); return }
    setUserId(user.id)
    const { data } = await getSupabase()
      .from('documentos')
      .select('*')
      .eq('perfilId', user.id)
      .order('subidoEn', { ascending: false })
    if (data) setDocumentos(data as Documento[])
    setLoading(false)
  }, [getSupabase])

  useEffect(() => { fetchDocumentos() }, [fetchDocumentos])

  const eliminar = async (id: string) => {
    if (!confirm('¿Eliminar este documento?')) return
    await getSupabase().from('documentos').delete().eq('id', id)
    setDocumentos((prev) => prev.filter((d) => d.id !== id))
  }

  const formatSize = (bytes: number | null) => {
    if (!bytes) return '—'
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-heading font-bold tracking-tight">Alumnos</h1>
          <p className="text-muted-foreground">Documentos y materiales para tus estudiantes</p>
        </div>
        <div className="flex gap-2">
          {userId && (
            <FileUpload
              bucket="documentos"
              path={userId}
              tipo="alumno"
              accept=".pdf,.doc,.docx,.txt,.md"
              buttonText="Subir documento"
              onUploadComplete={() => fetchDocumentos()}
            />
          )}
          <Link href="/alumnos/examenes">
            <Button variant="secondary">
              <GraduationCap className="mr-2 h-4 w-4" />
              Exámenes
            </Button>
          </Link>
        </div>
      </div>

      {loading ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Cargando documentos...
          </CardContent>
        </Card>
      ) : documentos.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-12">
            <FileText className="h-12 w-12 text-muted-foreground" />
            <div className="text-center">
              <p className="font-medium">No hay documentos</p>
              <p className="text-sm text-muted-foreground">
                Sube apuntes o materiales para generar resúmenes y exámenes con IA
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {documentos.map((doc) => (
            <Card key={doc.id} className="group relative">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <FileText className="h-8 w-8 text-primary" />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => eliminar(doc.id)}
                    aria-label="Eliminar documento"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </div>
                <CardTitle className="mt-2 text-base truncate">{doc.nombre}</CardTitle>
                <CardDescription>{formatSize(doc.tamañoBytes)}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  {new Date(doc.creadoEn).toLocaleDateString('es-ES')}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
