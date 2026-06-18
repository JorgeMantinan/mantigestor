'use client'

import { useState, useCallback, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { GraduationCap, Brain } from 'lucide-react'
import Link from 'next/link'

interface Examen {
  id: string
  tipo: string
  estado: string
  resultado: string | null
  creadoEn: string
  completadoEn: string | null
}

export default function ExamenesPage() {
  const [examenes, setExamenes] = useState<Examen[]>([])
  const [loading, setLoading] = useState(true)

  const getSupabase = useCallback(() => createClient(), [])

  useEffect(() => {
    const fetchExamenes = async () => {
      const { data: { user } } = await getSupabase().auth.getUser()
      if (!user) { setLoading(false); return }
      const { data } = await getSupabase()
        .from('examenes')
        .select('*')
        .eq('perfilId', user.id)
        .order('creadoEn', { ascending: false })
      if (data) setExamenes(data as Examen[])
      setLoading(false)
    }
    fetchExamenes()
  }, [getSupabase])

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
        <Link href="/dashboard/alumnos">
          <Button variant="outline">Volver a documentos</Button>
        </Link>
      </div>

      {loading ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">Cargando...</CardContent>
        </Card>
      ) : examenes.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-12">
            <Brain className="h-12 w-12 text-muted-foreground" />
            <div className="text-center">
              <p className="font-medium">No hay exámenes</p>
              <p className="text-sm text-muted-foreground">
                Sube documentos en la sección de alumnos y genera exámenes con IA
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {examenes.map((ex) => (
            <Card key={ex.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <GraduationCap className="h-5 w-5 text-primary" />
                    <CardTitle className="text-base capitalize">{ex.tipo}</CardTitle>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${estadoColor[ex.estado] ?? ''}`}>
                    {ex.estado}
                  </span>
                </div>
                <CardDescription>
                  Creado {new Date(ex.creadoEn).toLocaleDateString('es-ES')}
                  {ex.completadoEn && ` — Completado ${new Date(ex.completadoEn).toLocaleDateString('es-ES')}`}
                </CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
