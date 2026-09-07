'use client'

import { useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertTriangle, Clock, ArrowRight } from 'lucide-react'
import { detectarAlertasCobro, totalVencido, type AlertaCobro } from '@/lib/alertas-cobro'
import { useLanguage } from '@/contexts/language-context'

interface Factura {
  id: string
  tipo: string
  emisorReceptor: string
  fechaVencimiento: string | null
  total: number
  estado: string
}

const formatEuros = (cents: number) =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(cents / 100)

const NIVEL_CONFIG: Record<AlertaCobro['nivel'], { color: string; bg: string; label: string }> = {
  'vencida-mes': { color: 'text-red-600', bg: 'bg-red-500/10', label: '> 30 días' },
  'vencida-semana': { color: 'text-orange-600', bg: 'bg-orange-500/10', label: '1–7 días' },
  'vencida-hoy': { color: 'text-yellow-600', bg: 'bg-yellow-500/10', label: 'Hoy' },
  'por-vencer': { color: 'text-blue-600', bg: 'bg-blue-500/10', label: '≤ 3 días' },
}

export function WidgetAlertasCobro({ facturas }: { facturas: Factura[] }) {
  const router = useRouter()
  const { t } = useLanguage()
  const alertas = useMemo(() => detectarAlertasCobro(facturas), [facturas])
  const total = useMemo(() => totalVencido(alertas), [alertas])

  const top5 = alertas.slice(0, 5)

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-orange-500" aria-hidden="true" />
            {t('widgetAlertasCobro.titulo')}
          </CardTitle>
          {total > 0 && (
            <span className="text-xs font-semibold text-red-600">{formatEuros(total)}</span>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {top5.length === 0 ? (
          <div className="flex flex-col items-center py-4 text-center">
            <Clock className="h-6 w-6 text-muted-foreground mb-1" aria-hidden="true" />
            <p className="text-xs text-muted-foreground">{t('widgetAlertasCobro.sinFacturasPendientes')}</p>
          </div>
        ) : (
          <ul className="space-y-1.5">
            {top5.map(a => {
              const cfg = NIVEL_CONFIG[a.nivel]
              return (
                <li key={a.facturaId}>
                  <button
                    onClick={() => router.push(`/gestoria/facturas/${a.facturaId}`)}
                    className="flex items-center gap-2.5 w-full rounded-lg border p-2.5 text-left transition-colors hover:bg-muted/50"
                  >
                    <div className={`shrink-0 rounded-md p-1.5 ${cfg.bg}`}>
                      <span className={`text-[10px] font-bold ${cfg.color}`}>
                        {a.diasVencida > 0 ? `${a.diasVencida}d` : a.diasVencida === 0 ? 'HOY' : `${Math.abs(a.diasVencida)}d`}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium truncate">{a.cliente}</p>
                      <p className="text-[10px] text-muted-foreground">{cfg.label}</p>
                    </div>
                    <span className={`text-xs font-semibold ${cfg.color}`}>
                      {formatEuros(a.importe)}
                    </span>
                    <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" aria-hidden="true" />
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
