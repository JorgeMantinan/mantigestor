'use client'

import { useMemo } from 'react'
import { useLanguage } from '@/contexts/language-context'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertTriangle, CheckCircle, Lightbulb, ArrowRight } from 'lucide-react'

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
  accion?: string
  prioridad: 'alta' | 'media' | 'baja'
}

const ICONOS: Record<string, React.ReactNode> = {
  deduccion: <Lightbulb className="h-4 w-4 text-yellow-500" />,
  plazo: <AlertTriangle className="h-4 w-4 text-red-500" />,
  optimizacion: <CheckCircle className="h-4 w-4 text-green-500" />,
  recordatorio: <ArrowRight className="h-4 w-4 text-blue-500" />,
}

export function AlertasIVA({ facturas }: { facturas: Factura[] }) {
  const { t } = useLanguage()
  const alertas = useMemo(() => {
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

    // Plazo de presentación
    if (diasRestantes <= 15 && diasRestantes > 0) {
      alertas.push({
        tipo: 'plazo',
        titulo: t('alertasIva.quedanDias').replace('{dias}', String(diasRestantes)),
        descripcion: t('alertasIva.plazoVence').replace('{trimestre}', String(trimestre + 1)).replace('{fecha}', finTrimestre.toLocaleDateString('es-ES')),
        accion: t('alertasIva.irCalculadora303'),
        prioridad: 'alta',
      })
    }

    // IVA a favor
    if (ivaSoportado > ivaRepercutido) {
      const aFavor = ivaSoportado - ivaRepercutido
      alertas.push({
        tipo: 'optimizacion',
        titulo: t('alertasIva.aTuFavor').replace('{importe}', new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(aFavor / 100)),
        descripcion: t('alertasIva.ivaSoportadoSupera'),
        prioridad: 'media',
      })
    }

    // Gastos sin IVA deducible
    const gastosSinDeducir = gastosTrimestre.filter(f => f.iva === 0)
    if (gastosSinDeducir.length > 0) {
      const totalSinDeducir = gastosSinDeducir.reduce((s, f) => s + f.total, 0)
      alertas.push({
        tipo: 'recordatorio',
        titulo: t('alertasIva.gastosSinIvaDeducible').replace('{count}', String(gastosSinDeducir.length)),
        descripcion: t('alertasIva.totalEnGastos').replace('{importe}', new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(totalSinDeducir / 100)),
        prioridad: 'baja',
      })
    }

    // Facturas pendientes de pago
    const pendientes = facturas.filter(f => f.estado === 'pendiente' && f.tipo === 'gasto')
    if (pendientes.length > 3) {
      alertas.push({
        tipo: 'recordatorio',
        titulo: t('alertasIva.facturasGastoPendientes').replace('{count}', String(pendientes.length)),
        descripcion: t('alertasIva.pagarPermiteDeducir'),
        accion: t('alertasIva.verFacturasPendientes'),
        prioridad: 'media',
      })
    }

    // Optimización: pagar antes de fin de trimestre
    if (diasRestantes <= 30 && diasRestantes > 15) {
      const gastosPendientes = pendientes.filter(f => {
        const dias = Math.ceil((finTrimestre.getTime() - new Date(f.fechaEmision).getTime()) / (1000 * 60 * 60 * 24))
        return dias <= 30
      })
      if (gastosPendientes.length > 0) {
        const total = gastosPendientes.reduce((s, f) => s + Math.round(f.baseImponible * (f.iva / 100)), 0)
        alertas.push({
          tipo: 'deduccion',
          titulo: t('alertasIva.deduccionIvaAnticipada'),
          descripcion: t('alertasIva.siPagasFacturas').replace('{count}', String(gastosPendientes.length)).replace('{fecha}', finTrimestre.toLocaleDateString('es-ES')).replace('{importe}', new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(total / 100)),
          accion: t('alertasIva.marcarComoPagadas'),
          prioridad: 'alta',
        })
      }
    }

    return alertas.sort((a, b) => {
      const prioridad: Record<string, number> = { alta: 0, media: 1, baja: 2 }
      return (prioridad[a.prioridad] ?? 2) - (prioridad[b.prioridad] ?? 2)
    })
  }, [facturas])

  if (alertas.length === 0) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-yellow-500" /> {t('alertasIva.alertasInteligentesIva')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {alertas.map((alerta, i) => (
            <div key={i} className={`flex items-start gap-3 p-3 rounded-lg border ${
              alerta.prioridad === 'alta' ? 'border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/30' :
              alerta.prioridad === 'media' ? 'border-yellow-200 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-950/30' :
              'border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/30'
            }`}>
              {ICONOS[alerta.tipo]}
              <div className="flex-1">
                <p className="text-sm font-medium">{alerta.titulo}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{alerta.descripcion}</p>
              </div>
              {alerta.accion && (
                <Button variant="ghost" size="sm" className="text-xs shrink-0">
                  {alerta.accion}
                </Button>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
