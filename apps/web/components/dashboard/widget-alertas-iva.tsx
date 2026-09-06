'use client'

import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertTriangle, CheckCircle, Lightbulb, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { useLanguage } from '@/contexts/language-context'

interface Factura {
  fechaEmision: string
  tipo: string
  baseImponible: number
  iva: number
  total: number
  estado: string
}

interface AlertaIVA {
  tipo: 'deduccion' | 'plazo' | 'optimizacion' | 'recordatorio'
  titulo: string
  descripcion: string
  prioridad: 'alta' | 'media' | 'baja'
}

const ICONOS: Record<string, React.ReactNode> = {
  deduccion: <Lightbulb className="h-4 w-4 text-yellow-500" />,
  plazo: <AlertTriangle className="h-4 w-4 text-red-500" />,
  optimizacion: <CheckCircle className="h-4 w-4 text-green-500" />,
  recordatorio: <ArrowRight className="h-4 w-4 text-blue-500" />,
}

export function WidgetAlertasIVA({ facturas }: { facturas: Factura[] }) {
  const { t } = useLanguage()

  const alertaMasUrgente = useMemo(() => {
    const ahora = new Date()
    const mesActual = ahora.getMonth()
    const trimestre = Math.floor(mesActual / 3)
    const inicioTrimestre = new Date(ahora.getFullYear(), trimestre * 3, 1)
    const finTrimestre = new Date(ahora.getFullYear(), (trimestre + 1) * 3, 0)
    const diasRestantes = Math.ceil((finTrimestre.getTime() - ahora.getTime()) / (1000 * 60 * 60 * 24))

    const gastosTrimestre = facturas.filter(f =>
      f.tipo === 'gasto' && new Date(f.fechaEmision) >= inicioTrimestre
    )
    const ivaSoportado = gastosTrimestre.reduce((s, f) => s + Math.round(f.baseImponible * (f.iva / 100)), 0)

    const ingresosTrimestre = facturas.filter(f =>
      f.tipo === 'ingreso' && new Date(f.fechaEmision) >= inicioTrimestre
    )
    const ivaRepercutido = ingresosTrimestre.reduce((s, f) => s + Math.round(f.baseImponible * (f.iva / 100)), 0)

    const alertas: AlertaIVA[] = []

    if (diasRestantes <= 15 && diasRestantes > 0) {
      alertas.push({
        tipo: 'plazo',
        titulo: t('widgetAlertasIva.diasPresentar303').replace('{dias}', String(diasRestantes)),
        descripcion: t('widgetAlertasIva.plazoVence').replace('{fecha}', finTrimestre.toLocaleDateString('es-ES')),
        prioridad: 'alta',
      })
    }

    if (ivaSoportado > ivaRepercutido) {
      const aFavor = ivaSoportado - ivaRepercutido
      alertas.push({
        tipo: 'optimizacion',
        titulo: t('widgetAlertasIva.aTuFavor').replace('{importe}', new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(aFavor / 100)),
        descripcion: t('widgetAlertasIva.ivaSoportadoSupera'),
        prioridad: 'media',
      })
    }

    const gastosSinDeducir = gastosTrimestre.filter(f => f.iva === 0)
    if (gastosSinDeducir.length > 0) {
      alertas.push({
        tipo: 'recordatorio',
        titulo: t('widgetAlertasIva.gastosSinIva').replace('{count}', String(gastosSinDeducir.length)),
        descripcion: t('widgetAlertasIva.verificarSiCorrectos'),
        prioridad: 'baja',
      })
    }

    const pendientes = facturas.filter(f => f.estado === 'pendiente' && f.tipo === 'gasto')
    if (pendientes.length > 3) {
      alertas.push({
        tipo: 'recordatorio',
        titulo: t('widgetAlertasIva.facturasGastoPendientes').replace('{count}', String(pendientes.length)),
        descripcion: t('widgetAlertasIva.pagarAntesFinTrimestre'),
        prioridad: 'media',
      })
    }

    if (diasRestantes <= 30 && diasRestantes > 15) {
      const gastosPendientes = pendientes.filter(f => {
        const dias = Math.ceil((finTrimestre.getTime() - new Date(f.fechaEmision).getTime()) / (1000 * 60 * 60 * 24))
        return dias <= 30
      })
      if (gastosPendientes.length > 0) {
        const total = gastosPendientes.reduce((s, f) => s + Math.round(f.baseImponible * (f.iva / 100)), 0)
        alertas.push({
          tipo: 'deduccion',
          titulo: t('widgetAlertasIva.deduccionIvaAnticipada'),
          descripcion: t('widgetAlertasIva.pagaFacturasAntes')
            .replace('{count}', String(gastosPendientes.length))
            .replace('{fecha}', finTrimestre.toLocaleDateString('es-ES'))
            .replace('{importe}', new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(total / 100)),
          prioridad: 'alta',
        })
      }
    }

    return alertas.sort((a, b) => {
      const prio: Record<string, number> = { alta: 0, media: 1, baja: 2 }
      return (prio[a.prioridad] ?? 2) - (prio[b.prioridad] ?? 2)
    })[0] ?? null
  }, [facturas, t])

  if (!alertaMasUrgente) return null

  const bg = alertaMasUrgente.prioridad === 'alta'
    ? 'border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/30'
    : alertaMasUrgente.prioridad === 'media'
      ? 'border-yellow-200 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-950/30'
      : 'border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/30'

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-yellow-500" /> {t('widgetAlertasIva.alertasIva')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className={`flex items-start gap-3 p-3 rounded-lg border ${bg}`}>
          {ICONOS[alertaMasUrgente.tipo]}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">{alertaMasUrgente.titulo}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{alertaMasUrgente.descripcion}</p>
          </div>
        </div>
        <Link href="/fiscal?seccion=alertas-iva" className="block mt-3">
          <Button variant="ghost" size="sm" className="w-full text-xs">
            {t('widgetAlertasIva.verTodasAlertas')} <ArrowRight className="ml-1 h-3 w-3" aria-hidden="true" />
          </Button>
        </Link>
      </CardContent>
    </Card>
  )
}
