'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Calendar, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react'
import { getCalendarioFiscal } from '@mantigestor/utils'
import { cn } from '@/lib/utils'

const CAT_COLORS: Record<string, string> = {
  iva: 'bg-blue-500',
  irpf: 'bg-purple-500',
  retenciones: 'bg-orange-500',
  renta: 'bg-red-500',
  otros: 'bg-gray-500',
}

const CAT_LABELS: Record<string, string> = {
  iva: 'IVA',
  irpf: 'IRPF',
  retenciones: 'Retenciones',
  renta: 'Renta',
  otros: 'Otros',
}

export function CalendarioFiscal() {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())

  const fechas = useMemo(() => {
    return getCalendarioFiscal(year)
      .sort((a, b) => a.fechaLimite.getTime() - b.fechaLimite.getTime())
  }, [year])

  const proximas = useMemo(() => {
    const hoy = new Date()
    return fechas.filter(f => f.fechaLimite >= hoy).slice(0, 5)
  }, [fechas])

  const diasHasta = (fecha: Date) => {
    const diff = Math.ceil((fecha.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    return diff
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Calendar className="h-4 w-4" aria-hidden="true" />
          Próximos vencimientos fiscales
        </CardTitle>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-6 w-6"
            onClick={() => setYear(y => y - 1)} aria-label="Año anterior">
            <ChevronLeft className="h-3 w-3" />
          </Button>
          <span className="text-xs font-medium min-w-[2.5rem] text-center">{year}</span>
          <Button variant="ghost" size="icon" className="h-6 w-6"
            onClick={() => setYear(y => y + 1)} aria-label="Año siguiente"
            disabled={year >= now.getFullYear() + 1}>
            <ChevronRight className="h-3 w-3" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {proximas.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">No hay vencimientos pendientes este año</p>
        ) : (
          <div className="space-y-3">
            {proximas.map(f => {
              const dias = diasHasta(f.fechaLimite)
              const isUrgente = dias <= 7
              const isHoy = dias === 0
              return (
                <div key={f.modelo} className="flex items-center gap-3">
                  <div className={cn('h-2 w-2 rounded-full shrink-0', CAT_COLORS[f.categoria])} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium truncate">{f.descripcion}</span>
                      {isHoy && <Badge variant="destructive" className="text-[10px] px-1 py-0">HOY</Badge>}
                      {isUrgente && !isHoy && <Badge variant="secondary" className="text-[10px] px-1 py-0">{dias}d</Badge>}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{f.fechaLimite.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}</span>
                      <span>·</span>
                      <Badge variant="outline" className="text-[10px] px-1 py-0">{CAT_LABELS[f.categoria]}</Badge>
                    </div>
                  </div>
                  <a href={f.url} target="_blank" rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-foreground shrink-0"
                    aria-label={`Abrir sede AEAT para ${f.descripcion}`}>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
