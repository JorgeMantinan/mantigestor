'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FileText, User, Home, Briefcase, ArrowRight, RefreshCw } from 'lucide-react'
import Link from 'next/link'

interface AuditEntry {
  id: string
  accion: string
  entidad: string
  detalle: string | null
  creadoEn: string
}

const ICONS: Record<string, typeof FileText> = {
  factura: FileText,
  nomina: Briefcase,
  propiedad: Home,
  alumno: User,
}

const ACCION_LABELS: Record<string, string> = {
  crear: 'creó',
  editar: 'editó',
  eliminar: 'eliminó',
  cambio_estado: 'cambió estado de',
}

export function WidgetActivity() {
  const [actividad, setActividad] = useState<AuditEntry[]>([])
  const [loading, setLoading] = useState(true)

  const cargar = useCallback(async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: perfil } = await supabase
      .from('perfiles')
      .select('id')
      .eq('userId', user.id)
      .single()

    if (!perfil) return

    const { data } = await supabase
      .from('audit_log')
      .select('id, accion, entidad, detalle, creadoEn')
      .eq('perfilId', perfil.id)
      .order('creadoEn', { ascending: false })
      .limit(5)

    if (data) setActividad(data as AuditEntry[])
    setLoading(false)
  }, [])

  useEffect(() => { void cargar() }, [cargar])

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'ahora'
    if (mins < 60) return `hace ${mins}m`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `hace ${hours}h`
    const days = Math.floor(hours / 24)
    return `hace ${days}d`
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-sm font-medium">Actividad reciente</CardTitle>
        <div className="flex items-center gap-1">
          <button onClick={() => void cargar()} className="text-muted-foreground hover:text-foreground" aria-label="Recargar actividad">
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
          <Link href="/ajustes">
            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">
              Ver todo <ArrowRight className="ml-1 h-3 w-3" />
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-xs text-muted-foreground text-center py-4">Cargando...</p>
        ) : actividad.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">Sin actividad registrada</p>
        ) : (
          <div className="space-y-3">
            {actividad.map(entry => {
              const Icon = ICONS[entry.entidad] ?? FileText
              const accionLabel = ACCION_LABELS[entry.accion] ?? entry.accion
              return (
                <div key={entry.id} className="flex items-start gap-3">
                  <div className="mt-0.5 rounded-md bg-muted p-1.5">
                    <Icon className="h-3 w-3 text-muted-foreground" aria-hidden="true" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs">
                      <span className="capitalize font-medium">{entry.entidad}</span>
                      {' '}{accionLabel}
                      {entry.detalle && <span className="text-muted-foreground"> — {entry.detalle}</span>}
                    </p>
                    <p className="text-[10px] text-muted-foreground">{timeAgo(entry.creadoEn)}</p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
