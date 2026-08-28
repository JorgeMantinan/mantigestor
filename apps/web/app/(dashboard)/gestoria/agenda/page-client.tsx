'use client'

import { useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Calendar, Users } from 'lucide-react'
import { getCalendarioFiscal } from '@mantigestor/utils'
import { CalendarioMensual, PanelDia } from '@/components/fiscal/calendario-mensual'
import { usePersonaActiva } from '@/contexts/persona-activa-context'

export function AgendaPageClient() {
  const { personas, esPropio } = usePersonaActiva()
  const ahora = new Date()
  const [anyo, setAnyo] = useState(ahora.getFullYear())
  const [mes, setMes] = useState(ahora.getMonth())
  const [diaSeleccionado, setDiaSeleccionado] = useState<number | null>(null)

  const calendario = getCalendarioFiscal(anyo)

  const handleMesCambio = useCallback((nuevoAnyo: number, nuevoMes: number) => {
    setAnyo(nuevoAnyo)
    setMes(nuevoMes)
    setDiaSeleccionado(null)
  }, [])

  // Contar vencimientos del mes actual
  const vencimientosMes = calendario.filter(v => {
    const f = v.fechaLimite instanceof Date ? v.fechaLimite : new Date(v.fechaLimite)
    return f.getFullYear() === anyo && f.getMonth() === mes
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10">
            <Calendar className="h-7 w-7 text-primary" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-3xl font-heading font-bold tracking-tight">Agenda del gestor</h1>
            <p className="text-muted-foreground">
              Calendario de vencimientos fiscales
              {!esPropio && ' · Gestionando otra persona'}
            </p>
          </div>
        </div>
        {personas.length > 0 && (
          <Badge variant="outline" className="flex items-center gap-1.5">
            <Users className="h-3 w-3" aria-hidden="true" />
            {personas.length + 1} perfiles
          </Badge>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Calendario */}
        <div className="lg:col-span-2">
          <Card>
            <CardContent className="pt-6">
              <CalendarioMensual
                anyo={anyo}
                mes={mes}
                vencimientos={calendario}
                onMesCambio={handleMesCambio}
                diaSeleccionado={diaSeleccionado}
                onDiaClick={setDiaSeleccionado}
              />
            </CardContent>
          </Card>
        </div>

        {/* Panel lateral */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Detalle del día</CardTitle>
              <CardDescription>
                {diaSeleccionado
                  ? `${diaSeleccionado} de ${new Date(anyo, mes).toLocaleDateString('es-ES', { month: 'long' })}`
                  : 'Selecciona un día en el calendario'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PanelDia
                dia={diaSeleccionado}
                anyo={anyo}
                mes={mes}
                vencimientos={calendario}
              />
            </CardContent>
          </Card>

          {/* Resumen del mes */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Resumen del mes</CardTitle>
            </CardHeader>
            <CardContent>
              {vencimientosMes.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sin vencimientos este mes</p>
              ) : (
                <div className="space-y-2">
                  {Object.entries(
                    vencimientosMes.reduce((acc, v) => {
                      acc[v.categoria] = (acc[v.categoria] ?? 0) + 1
                      return acc
                    }, {} as Record<string, number>)
                  ).map(([cat, count]) => (
                    <div key={cat} className="flex items-center justify-between rounded-lg border p-2">
                      <span className="text-sm capitalize">{cat}</span>
                      <Badge variant="secondary">{count} {count === 1 ? 'vencimiento' : 'vencimientos'}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
