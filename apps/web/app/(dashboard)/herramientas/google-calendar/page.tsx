'use client'

import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CalendarDays, Download, FileText, Repeat, Clock } from 'lucide-react'
import { eventosVencimientosFacturas, eventosCalendarioFiscal, eventosPagosRecurrentes, descargarICS, type FacturaCalendario } from '@/lib/google-calendar'
import { listarPagos, type PagoRecurrente } from '@/lib/pagos-recurrentes'
import { useLanguage } from '@/contexts/language-context'
import { createClient } from '@/lib/supabase/client'


export default function GoogleCalendarPage() {
  const { t } = useLanguage()
  const supabase = createClient()
  const [facturas, setFacturas] = useState<FacturaCalendario[]>([])
  const [pagos, setPagos] = useState<PagoRecurrente[]>([])
  const [anyoFiscal, setAnyoFiscal] = useState(() => new Date().getFullYear())
  const [plazosFiscales, setPlazosFiscales] = useState<Array<{ modeloNumero: string | null; periodo: string; fechaLimiteReferencia: Date | string | null }>>([])

  useEffect(() => {
    setPagos(listarPagos())

    const cargarFacturas = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        const { data: perfil } = await supabase
          .from('perfiles')
          .select('id')
          .eq('userId', user.id)
          .single()
        if (!perfil) return
        const { data } = await supabase
          .from('facturas')
          .select('*')
          .eq('perfilId', perfil.id)
        setFacturas((data ?? []) as unknown as FacturaCalendario[])
      } catch {
        // silently fail
      }
    }

    const cargarPlazos = async () => {
      try {
        const { data, error } = await supabase
          .from('deadlines')
          .select('modeloNumero, periodo, fechaLimiteReferencia')
          .not('fechaLimiteReferencia', 'is', null)
        if (!error && data) {
          setPlazosFiscales(data as Array<{ modeloNumero: string | null; periodo: string; fechaLimiteReferencia: Date | string | null }>)
        }
      } catch {
        // silently fail
      }
    }

    cargarFacturas()
    cargarPlazos()
  }, [supabase])

  const eventosVencimientos = useMemo(() => eventosVencimientosFacturas(facturas), [facturas])
  const eventosFiscales = useMemo(() => eventosCalendarioFiscal(plazosFiscales, anyoFiscal), [plazosFiscales, anyoFiscal])
  const eventosRecurrentes = useMemo(() => eventosPagosRecurrentes(pagos, anyoFiscal), [pagos, anyoFiscal])
  const todosLosEventos = useMemo(() => [...eventosVencimientos, ...eventosFiscales, ...eventosRecurrentes], [eventosVencimientos, eventosFiscales, eventosRecurrentes])

  const formatearFecha = (fecha: Date) => fecha.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t('googleCalendar.titulo')}</h1>
        <p className="text-muted-foreground">{t('googleCalendar.subtitulo')}</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <CalendarDays className="h-4 w-4" /> {t('googleCalendar.vencimientosFacturas')}
              </CardTitle>
              <CardDescription>{t('googleCalendar.vencimientosDescripcion')}</CardDescription>
            </div>
            <Button
              onClick={() => descargarICS(eventosVencimientos, `vencimientos-facturas-${anyoFiscal}`)}
              disabled={eventosVencimientos.length === 0}
            >
              <Download className="mr-2 h-4 w-4" /> {t('googleCalendar.descargarICS')}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {eventosVencimientos.length === 0 ? (
            <p className="text-center text-muted-foreground py-6">{t('googleCalendar.sinVencimientos')}</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {eventosVencimientos.map((ev, i) => (
                <div key={i} className="flex items-center gap-3 rounded-lg border p-3 text-sm">
                  <div className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: ev.color }} />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">{ev.titulo}</p>
                    <p className="text-xs text-muted-foreground">{formatearFecha(ev.fechaInicio)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-4 w-4" /> {t('googleCalendar.calendarioFiscal')}
              </CardTitle>
              <CardDescription>{t('googleCalendar.fiscalDescripcion')}</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={anyoFiscal}
                onChange={e => setAnyoFiscal(Number(e.target.value))}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              >
                {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
              <Button
                onClick={() => descargarICS(eventosFiscales, `calendario-fiscal-${anyoFiscal}`)}
                disabled={eventosFiscales.length === 0}
              >
                <Download className="mr-2 h-4 w-4" /> {t('googleCalendar.descargarICS')}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {eventosFiscales.length === 0 ? (
            <p className="text-center text-muted-foreground py-6">{t('googleCalendar.sinPlazosFiscales')}</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {eventosFiscales.map((ev, i) => (
                <div key={i} className="flex items-center gap-3 rounded-lg border p-3 text-sm">
                  <div className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: ev.color }} />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">{ev.titulo}</p>
                    <p className="text-xs text-muted-foreground">{formatearFecha(ev.fechaInicio)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Repeat className="h-4 w-4" /> {t('googleCalendar.pagosRecurrentes')}
              </CardTitle>
              <CardDescription>{t('googleCalendar.recurrentesDescripcion')}</CardDescription>
            </div>
            <Button
              onClick={() => descargarICS(eventosRecurrentes, `pagos-recurrentes-${anyoFiscal}`)}
              disabled={eventosRecurrentes.length === 0}
            >
              <Download className="mr-2 h-4 w-4" /> {t('googleCalendar.descargarICS')}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {eventosRecurrentes.length === 0 ? (
            <p className="text-center text-muted-foreground py-6">{t('googleCalendar.sinRecurrentes')}</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {eventosRecurrentes.slice(0, 20).map((ev, i) => (
                <div key={i} className="flex items-center gap-3 rounded-lg border p-3 text-sm">
                  <div className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: ev.color }} />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">{ev.titulo}</p>
                    <p className="text-xs text-muted-foreground">{formatearFecha(ev.fechaInicio)}</p>
                  </div>
                </div>
              ))}
              {eventosRecurrentes.length > 20 && (
                <p className="text-xs text-muted-foreground text-center">
                  +{eventosRecurrentes.length - 20} {t('googleCalendar.eventosAdicionales')}
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="h-4 w-4" /> {t('googleCalendar.exportarTodo')}
              </CardTitle>
              <CardDescription>{t('googleCalendar.todoDescripcion')}</CardDescription>
            </div>
            <Button
              onClick={() => descargarICS(todosLosEventos, `mantigestor-calendario-completo-${anyoFiscal}`)}
              disabled={todosLosEventos.length === 0}
              variant="default"
            >
              <Download className="mr-2 h-4 w-4" /> {t('googleCalendar.descargarTodo')}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3 text-center">
            <div className="rounded-lg border p-4">
              <p className="text-2xl font-bold">{eventosVencimientos.length}</p>
              <p className="text-xs text-muted-foreground">{t('googleCalendar.vencimientos')}</p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-2xl font-bold">{eventosFiscales.length}</p>
              <p className="text-xs text-muted-foreground">{t('googleCalendar.plazosFiscales')}</p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-2xl font-bold">{eventosRecurrentes.length}</p>
              <p className="text-xs text-muted-foreground">{t('googleCalendar.pagosMensuales')}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
