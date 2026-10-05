'use client'

import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Clock, AlertTriangle, Banknote } from 'lucide-react'
import { calcularRatioCobro } from '@/lib/ratio-cobro'
import { useLanguage } from '@/contexts/language-context'

interface Factura {
  tipo: string
  fechaEmision: string
  fechaVencimiento: string | null
  total: number
  estado: string
}

const formatEuros = (cents: number) =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(cents / 100)

function CircularProgress({ value }: { value: number }) {
  const radius = 14
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (value / 100) * circumference

  return (
    <svg width="36" height="36" className="shrink-0" aria-hidden="true">
      <circle
        cx="18" cy="18" r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        className="text-muted/50"
      />
      <circle
        cx="18" cy="18" r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        className="text-green-600"
        transform="rotate(-90 18 18)"
      />
      <text x="18" y="19" textAnchor="middle" dominantBaseline="middle" className="fill-foreground text-[9px] font-semibold">
        {value}
      </text>
    </svg>
  )
}

export function WidgetCobro({ facturas }: { facturas: Factura[] }) {
  const { t } = useLanguage()
  const ratio = useMemo(() => calcularRatioCobro(facturas), [facturas])

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">{t('widgetCobro.titulo')}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          {/* Días medio cobro */}
          <div className="flex items-center gap-2.5 rounded-lg border p-2.5">
            <div className="rounded-md bg-blue-500/10 p-1.5">
              <Clock className="h-3.5 w-3.5 text-blue-600" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-muted-foreground leading-tight">{t('widgetCobro.diasMedioCobro')}</p>
              <p className="text-lg font-bold leading-tight">{ratio.diasMedioCobro ?? '—'}</p>
            </div>
          </div>

          {/* % Cobrado */}
          <div className="flex items-center gap-2.5 rounded-lg border p-2.5">
            <CircularProgress value={ratio.porcentajeCobrado} />
            <div className="min-w-0">
              <p className="text-[10px] text-muted-foreground leading-tight">{t('widgetCobro.porcentajeCobrado')}</p>
              <p className="text-lg font-bold leading-tight">{ratio.porcentajeCobrado}%</p>
            </div>
          </div>

          {/* Vencidas */}
          <div className="flex items-center gap-2.5 rounded-lg border p-2.5">
            <div className={`rounded-md p-1.5 ${ratio.facturasVencidas > 0 ? 'bg-red-500/10' : 'bg-green-500/10'}`}>
              <AlertTriangle className={`h-3.5 w-3.5 ${ratio.facturasVencidas > 0 ? 'text-red-600' : 'text-green-600'}`} aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-muted-foreground leading-tight">{t('widgetCobro.vencidas')}</p>
              <p className={`text-lg font-bold leading-tight ${ratio.facturasVencidas > 0 ? 'text-red-600' : ''}`}>
                {ratio.facturasVencidas}
              </p>
            </div>
          </div>

          {/* Pendiente */}
          <div className="flex items-center gap-2.5 rounded-lg border p-2.5">
            <div className="rounded-md bg-orange-500/10 p-1.5">
              <Banknote className="h-3.5 w-3.5 text-orange-600" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-muted-foreground leading-tight">{t('widgetCobro.pendiente')}</p>
              <p className="text-lg font-bold leading-tight truncate">{formatEuros(ratio.montoPendiente)}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
