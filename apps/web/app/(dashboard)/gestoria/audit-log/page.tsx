'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { History, Trash2, Edit, Plus, ArrowRightLeft } from 'lucide-react'

interface AuditEntry {
  id: string
  accion: string
  entidad: string
  entidadId: string | null
  detalle: string | null
  creadoEn: string
}

const ICONOS: Record<string, React.ReactNode> = {
  crear: <Plus className="h-3 w-3 text-green-600" />,
  editar: <Edit className="h-3 w-3 text-blue-600" />,
  eliminar: <Trash2 className="h-3 w-3 text-red-600" />,
  cambio_estado: <ArrowRightLeft className="h-3 w-3 text-yellow-600" />,
}

const COLORS: Record<string, string> = {
  crear: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  editar: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  eliminar: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  cambio_estado: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
}

export default function AuditLogPage() {
  const [entradas, setEntradas] = useState<AuditEntry[]>([])
  const [cargando, setCargando] = useState(true)
  const [filtro, setFiltro] = useState('todos')
  const getSupabase = useCallback(() => createClient(), [])

  useEffect(() => {
    const cargar = async () => {
      const { data: { user } } = await getSupabase().auth.getUser()
      if (!user) { setCargando(false); return }
      const { data } = await getSupabase()
        .from('audit_log')
        .select('*')
        .eq('perfilId', user.id)
        .order('creadoEn', { ascending: false })
        .limit(200)
      if (data) setEntradas(data as AuditEntry[])
      setCargando(false)
    }
    cargar()
  }, [getSupabase])

  const filtradas = filtro === 'todos' ? entradas : entradas.filter(e => e.accion === filtro)
  const tipos = [...new Set(entradas.map(e => e.accion))]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Registro de actividad</h1>
        <p className="text-muted-foreground">Historial de cambios en tus datos</p>
      </div>

      <div className="flex gap-2 flex-wrap">
        <Button variant={filtro === 'todos' ? 'default' : 'outline'} size="sm" onClick={() => setFiltro('todos')}>
          Todos ({entradas.length})
        </Button>
        {tipos.map(t => (
          <Button key={t} variant={filtro === t ? 'default' : 'outline'} size="sm" onClick={() => setFiltro(t)}>
            {t} ({entradas.filter(e => e.accion === t).length})
          </Button>
        ))}
      </div>

      {cargando ? (
        <p className="text-sm text-muted-foreground">Cargando registro...</p>
      ) : filtradas.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No hay registros{filtro !== 'todos' ? ` de tipo "${filtro}"` : ''}</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y">
              {filtradas.map(entry => (
                <div key={entry.id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30">
                  <span className={`p-1.5 rounded-full ${COLORS[entry.accion] ?? 'bg-gray-100'}`}>
                    {ICONOS[entry.accion] ?? <History className="h-3 w-3" />}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium capitalize">{entry.accion}</span>
                      <span className="text-xs text-muted-foreground">{entry.entidad}</span>
                    </div>
                    {entry.detalle && (
                      <p className="text-xs text-muted-foreground truncate">{entry.detalle}</p>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(entry.creadoEn).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
