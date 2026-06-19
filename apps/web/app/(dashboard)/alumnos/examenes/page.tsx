'use client'

import { useState, useCallback, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { GraduationCap, Brain, Loader2, ChevronDown, ChevronUp } from 'lucide-react'
import Link from 'next/link'

interface Examen {
  id: string
  tipo: string
  estado: string
  resultado: string | null
  creadoEn: string
  completadoEn: string | null
}

interface Pregunta {
  pregunta: string
  opciones: Record<string, string>
  correcta: string
}

interface ExamenData {
  titulo: string
  preguntas: Pregunta[]
}

export default function ExamenesPage() {
  const [examenes, setExamenes] = useState<Examen[]>([])
  const [loading, setLoading] = useState(true)
  const [generando, setGenerando] = useState(false)
  const [expandido, setExpandido] = useState<string | null>(null)

  const getSupabase = useCallback(() => createClient(), [])

  const fetchExamenes = useCallback(async () => {
    const { data: { user } } = await getSupabase().auth.getUser()
    if (!user) { setLoading(false); return }
    const { data } = await getSupabase()
      .from('examenes')
      .select('*')
      .eq('perfilId', user.id)
      .order('creadoEn', { ascending: false })
    if (data) setExamenes(data as Examen[])
    setLoading(false)
  }, [getSupabase])

  useEffect(() => { fetchExamenes() }, [fetchExamenes])

  const generar = async () => {
    setGenerando(true)
    try {
      const res = await fetch('/api/examenes', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Error al generar')
      setExamenes((prev) => [data as Examen, ...prev])
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al generar el examen')
    } finally {
      setGenerando(false)
    }
  }

  const parseResultado = (raw: string | null): ExamenData | null => {
    if (!raw) return null
    try {
      const jsonMatch = raw.match(/\{[\s\S]*\}/)
      if (!jsonMatch) return null
      return JSON.parse(jsonMatch[0]) as ExamenData
    } catch {
      return null
    }
  }

  const estadoColor: Record<string, string> = {
    pendiente: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
    completado: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
    error: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-heading font-bold tracking-tight">Exámenes</h1>
          <p className="text-muted-foreground">Exámenes generados por IA desde tus documentos</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={generar} disabled={generando}>
            {generando ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generando...
              </>
            ) : (
              <>
                <Brain className="mr-2 h-4 w-4" />
                Generar examen
              </>
            )}
          </Button>
          <Link href="/alumnos">
            <Button variant="outline">Volver a documentos</Button>
          </Link>
        </div>
      </div>

      {loading ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">Cargando...</CardContent>
        </Card>
      ) : examenes.length === 0 && !generando ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-12">
            <Brain className="h-12 w-12 text-muted-foreground" />
            <div className="text-center">
              <p className="font-medium">No hay exámenes</p>
              <p className="text-sm text-muted-foreground">
                Sube documentos en la sección de alumnos y pulsa &quot;Generar examen&quot; para crear uno con IA
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {generando && (
            <Card>
              <CardContent className="flex items-center justify-center gap-3 py-6">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <span className="text-sm text-muted-foreground">Generando examen con IA...</span>
              </CardContent>
            </Card>
          )}
          {examenes.map((ex) => {
            const examenData = parseResultado(ex.resultado)
            return (
              <Card key={ex.id}>
                <CardHeader
                  className="cursor-pointer pb-3 select-none"
                  onClick={() => setExpandido(expandido === ex.id ? null : ex.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <GraduationCap className="h-5 w-5 text-primary" />
                      <CardTitle className="text-base capitalize">
                        {examenData?.titulo ?? (ex.tipo === 'alumnos' ? 'Examen de alumnos' : ex.tipo)}
                      </CardTitle>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${estadoColor[ex.estado] ?? ''}`}>
                        {ex.estado}
                      </span>
                      {ex.estado === 'completado' && examenData && (
                        expandido === ex.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                      )}
                    </div>
                  </div>
                  <CardDescription>
                    Creado {new Date(ex.creadoEn).toLocaleDateString('es-ES')}
                    {ex.completadoEn && ` — Completado ${new Date(ex.completadoEn).toLocaleDateString('es-ES')}`}
                  </CardDescription>
                </CardHeader>
                {expandido === ex.id && examenData && (
                  <CardContent className="space-y-6 pt-2">
                    {examenData.preguntas.map((p, i) => (
                      <div key={i} className="space-y-2 rounded-lg border p-4">
                        <p className="font-medium">
                          {i + 1}. {p.pregunta}
                        </p>
                        <div className="ml-4 space-y-1">
                          {Object.entries(p.opciones).map(([letra, texto]) => (
                            <label
                              key={letra}
                              className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors ${
                                letra === p.correcta
                                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                  : 'hover:bg-muted'
                              }`}
                            >
                              <span className="flex h-5 w-5 items-center justify-center rounded-full border text-xs font-medium">
                                {letra}
                              </span>
                              {texto}
                              {letra === p.correcta && (
                                <span className="ml-auto text-xs text-green-600">Correcta</span>
                              )}
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                  </CardContent>
                )}
                {expandido === ex.id && !examenData && ex.resultado && (
                  <CardContent className="pt-2">
                    <p className="whitespace-pre-wrap text-sm text-muted-foreground">{ex.resultado}</p>
                  </CardContent>
                )}
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
