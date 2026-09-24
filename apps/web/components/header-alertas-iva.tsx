'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { usePersonaActiva } from '@/contexts/persona-activa-context'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Lightbulb, AlertTriangle, CheckCircle, ArrowRight, Receipt } from 'lucide-react'
import Link from 'next/link'

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

const PRIORIDAD_CONFIG = {
  alta: { label: 'Alta', className: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400' },
  media: { label: 'Media', className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400' },
  baja: { label: 'Baja', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400' },
} as const

function getPrioridad(p: 'alta' | 'media' | 'baja') {
  return PRIORIDAD_CONFIG[p]
}

export function HeaderAlertasIVA() {
  const [facturas, setFacturas] = useState<Factura[]>([])
  const [cargando, setCargando] = useState(true)
  const getSupabase = useCallback(() => createClient(), [])
  const { perfilActivoId } = usePersonaActiva()

  useEffect(() => {
    const fetchFacturas = async () => {
      try {
        const supabase = getSupabase()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { setCargando(false); return }

        const perfilId = perfilActivoId || user.id
        const anioActual = new Date().getFullYear()

        const { data } = await supabase
          .from('facturas')
          .select('fechaEmision, tipo, baseImponible, iva, total, estado')
          .eq('perfilId', perfilId)
          .gte('fechaEmision', `${anioActual}-01-01`)
          .lt('fechaEmision', `${anioActual + 1}-01-01`)

        if (data) setFacturas(data as Factura[])
      } catch {
        // silent
      } finally {
        setCargando(false)
      }
    }
    fetchFacturas()
  }, [getSupabase, perfilActivoId])

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

    if (diasRestantes <= 15 && diasRestantes > 0) {
      alertas.push({
        tipo: 'plazo',
        titulo: `Quedan ${diasRestantes} días para presentar el 303`,
        descripcion: `El plazo vence el ${finTrimestre.toLocaleDateString('es-ES')}.`,
        prioridad: 'alta',
      })
    }

    if (ivaSoportado > ivaRepercutido) {
      const aFavor = ivaSoportado - ivaRepercutido
      alertas.push({
        tipo: 'optimizacion',
        titulo: `${new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(aFavor / 100)} a tu favor`,
        descripcion: 'IVA soportado supera al repercutido.',
        prioridad: 'media',
      })
    }

    const gastosSinDeducir = gastosTrimestre.filter(f => f.iva === 0)
    if (gastosSinDeducir.length > 0) {
      alertas.push({
        tipo: 'recordatorio',
        titulo: `${gastosSinDeducir.length} gastos sin IVA deducible`,
        descripcion: 'Verifica si son correctos.',
        prioridad: 'baja',
      })
    }

    const pendientes = facturas.filter(f => f.estado === 'pendiente' && f.tipo === 'gasto')
    if (pendientes.length > 3) {
      alertas.push({
        tipo: 'recordatorio',
        titulo: `${pendientes.length} facturas de gasto pendientes`,
        descripcion: 'Pagar antes de fin de trimestre permite deducir IVA.',
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
          titulo: 'Deducción IVA anticipada',
          descripcion: `Paga ${gastosPendientes.length} facturas antes del ${finTrimestre.toLocaleDateString('es-ES')} para deducir ${new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(total / 100)}.`,
          prioridad: 'alta',
        })
      }
    }

    return alertas.sort((a, b) => {
      const prio: Record<string, number> = { alta: 0, media: 1, baja: 2 }
      return (prio[a.prioridad] ?? 2) - (prio[b.prioridad] ?? 2)
    })
  }, [facturas])

  if (cargando || alertas.length === 0) {
    return (
      <Button variant="ghost" className="relative h-8 w-8 shrink-0 p-0 text-muted-foreground" disabled aria-label="Alertas IVA">
        <Receipt className="h-5 w-5" aria-hidden="true" />
      </Button>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="relative h-8 w-8 shrink-0 p-0 text-muted-foreground"
          aria-label={`Alertas IVA (${alertas.length})`}
        >
          <Receipt className="h-5 w-5" aria-hidden="true" />
          <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-medium text-destructive-foreground">
            {alertas.length > 9 ? '9+' : alertas.length}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-[320px] max-h-[400px] overflow-y-auto" align="end" forceMount>
        <div className="px-4 py-2 text-xs font-medium text-muted-foreground">
          Alertas IVA
        </div>
        <DropdownMenuSeparator />
        {alertas.slice(0, 5).map((alerta, i) => {
          const prio = getPrioridad(alerta.prioridad)
          const bg = alerta.prioridad === 'alta'
            ? 'bg-red-50 dark:bg-red-950/30'
            : alerta.prioridad === 'media'
              ? 'bg-yellow-50 dark:bg-yellow-950/30'
              : 'bg-blue-50 dark:bg-blue-950/30'
          return (
            <DropdownMenuItem key={i} className={`flex items-start gap-3 px-4 py-3 cursor-default ${bg}`}>
              <div className="mt-0.5 shrink-0">{ICONOS[alerta.tipo]}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium leading-tight">{alerta.titulo}</p>
                  <Badge variant="secondary" className={`shrink-0 text-[10px] px-1.5 py-0 ${prio.className}`}>
                    {prio.label}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{alerta.descripcion}</p>
              </div>
            </DropdownMenuItem>
          )
        })}
        {alertas.length > 5 && (
          <div className="px-4 py-2 text-center text-xs text-muted-foreground">
            +{alertas.length - 5} más
          </div>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild className="cursor-pointer">
          <Link href="/fiscal?seccion=alertas-iva" className="flex items-center justify-center gap-2 text-sm font-medium">
            Ver todas las alertas <ArrowRight className="h-4 w-4" />
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
