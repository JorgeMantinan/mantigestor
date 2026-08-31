'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Clock, CheckCircle, AlertCircle, FileText } from 'lucide-react'

interface AuditEntry {
  id: string
  accion: string
  entidad: string
  entidadId: string | null
  detalle: string | null
  creadoEn: string
}

interface TimelineFacturaProps {
  facturaId: string
}

const ICONOS: Record<string, React.ReactNode> = {
  crear: <FileText className="h-4 w-4 text-blue-600" />,
  editar: <Clock className="h-4 w-4 text-yellow-600" />,
  eliminar: <AlertCircle className="h-4 w-4 text-red-600" />,
  cambio_estado: <CheckCircle className="h-4 w-4 text-green-600" />,
}

export function TimelineFactura({ facturaId }: TimelineFacturaProps) {
  const [eventos, setEventos] = useState<AuditEntry[]>([])
  const [cargando, setCargando] = useState(true)
  const getSupabase = useCallback(() => createClient(), [])

  useEffect(() => {
    const cargar = async () => {
      const { data } = await getSupabase()
        .from('audit_log')
        .select('*')
        .eq('entidad', 'factura')
        .eq('entidadId', facturaId)
        .order('creadoEn', { ascending: true })
      if (data) setEventos(data as AuditEntry[])
      setCargando(false)
    }
    cargar()
  }, [getSupabase, facturaId])

  if (cargando) return <p className="text-xs text-muted-foreground">Cargando historial...</p>
  if (eventos.length === 0) return <p className="text-xs text-muted-foreground">Sin eventos registrados</p>

  return (
    <div className="relative ml-3 border-l-2 border-muted pl-6 space-y-4">
      {eventos.map((evento, i) => (
        <div key={evento.id} className="relative">
          <div className="absolute -left-[31px] top-0 bg-background rounded-full p-0.5">
            {ICONOS[evento.accion] ?? <Clock className="h-4 w-4 text-muted-foreground" />}
          </div>
          <div>
            <p className="text-sm font-medium capitalize">{evento.accion.replace(/_/g, ' ')}</p>
            {evento.detalle && <p className="text-xs text-muted-foreground">{evento.detalle}</p>}
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {new Date(evento.creadoEn).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}
