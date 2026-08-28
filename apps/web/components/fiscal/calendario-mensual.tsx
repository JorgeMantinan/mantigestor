'use client'

import { useMemo } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { FechaFiscal } from '@mantigestor/utils'
import Link from 'next/link'

const COLORES_CATEGORIA: Record<string, string> = {
  iva: 'bg-blue-500/10 text-blue-700 border-blue-200',
  irpf: 'bg-green-500/10 text-green-700 border-green-200',
  retenciones: 'bg-orange-500/10 text-orange-700 border-orange-200',
  renta: 'bg-red-500/10 text-red-700 border-red-200',
  otros: 'bg-gray-500/10 text-gray-700 border-gray-200',
}

const DIAS_SEMANA = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

interface VencimientoDia {
  modelo: string
  descripcion: string
  categoria: string
  fechaLimite: Date
  diasRestantes: number
}

interface CalendarioMensualProps {
  anyo: number
  mes: number // 0-11
  vencimientos: FechaFiscal[]
  onMesCambio: (anyo: number, mes: number) => void
  diaSeleccionado: number | null
  onDiaClick: (dia: number) => void
}

export function CalendarioMensual({
  anyo,
  mes,
  vencimientos,
  onMesCambio,
  diaSeleccionado,
  onDiaClick,
}: CalendarioMensualProps) {
  const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

  const hoy = new Date()
  const diaActual = hoy.getDate()
  const mesActual = hoy.getMonth()
  const anyoActual = hoy.getFullYear()

  // Primer día del mes (0=dom, 1=lun...) → ajustar a lunes primero
  const primerDia = new Date(anyo, mes, 1).getDay()
  const offsetLunes = primerDia === 0 ? 6 : primerDia - 1 // 0=lun, 6=dom
  const diasEnMes = new Date(anyo, mes + 1, 0).getDate()

  // Vencimientos agrupados por día
  const vencimientosPorDia = useMemo(() => {
    const mapa = new Map<number, VencimientoDia[]>()
    const hoyUtc = Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth(), hoy.getUTCDate())

    for (const v of vencimientos) {
      const fecha = v.fechaLimite instanceof Date ? v.fechaLimite : new Date(v.fechaLimite)
      if (fecha.getFullYear() !== anyo || fecha.getMonth() !== mes) continue

      const dia = fecha.getDate()
      const diasRestantes = Math.round((fecha.getTime() - hoyUtc) / (1000 * 60 * 60 * 24))

      if (diasRestantes < 0) continue // solo futuros o hoy

      const existentes = mapa.get(dia) ?? []
      existentes.push({
        modelo: v.modelo,
        descripcion: v.descripcion,
        categoria: v.categoria,
        fechaLimite: fecha,
        diasRestantes,
      })
      mapa.set(dia, existentes)
    }
    return mapa
  }, [vencimientos, anyo, mes, hoy])

  function mesAnterior() {
    if (mes === 0) onMesCambio(anyo - 1, 11)
    else onMesCambio(anyo, mes - 1)
  }

  function mesSiguiente() {
    if (mes === 11) onMesCambio(anyo + 1, 0)
    else onMesCambio(anyo, mes + 1)
  }

  const celdas: (number | null)[] = []
  for (let i = 0; i < offsetLunes; i++) celdas.push(null)
  for (let d = 1; d <= diasEnMes; d++) celdas.push(d)

  return (
    <div className="space-y-4">
      {/* Navegación mes */}
      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" onClick={mesAnterior}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h3 className="text-lg font-heading font-semibold">
          {MESES[mes]} {anyo}
        </h3>
        <Button variant="outline" size="sm" onClick={mesSiguiente}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Cabecera días */}
      <div className="grid grid-cols-7 gap-1">
        {DIAS_SEMANA.map(d => (
          <div key={d} className="py-1 text-center text-xs font-medium text-muted-foreground">
            {d}
          </div>
        ))}
      </div>

      {/* Grid del calendario */}
      <div className="grid grid-cols-7 gap-1">
        {celdas.map((dia, idx) => {
          if (dia === null) {
            return <div key={`empty-${idx}`} className="aspect-square" />
          }

          const esHoy = dia === diaActual && mes === mesActual && anyo === anyoActual
          const seleccionado = dia === diaSeleccionado
          const vencimientosDia = vencimientosPorDia.get(dia) ?? []
          const tieneVencimientos = vencimientosDia.length > 0

          // Color del borde según urgencia
          const maxUrgencia = vencimientosDia.reduce((min, v) =>
            v.diasRestantes < min ? v.diasRestantes : min, 30)
          const bordeUrgencia = maxUrgencia <= 3
            ? 'border-red-500'
            : maxUrgencia <= 7
              ? 'border-yellow-500'
              : tieneVencimientos
                ? 'border-blue-400'
                : 'border-transparent'

          return (
            <button
              key={dia}
              type="button"
              onClick={() => onDiaClick(dia)}
              className={`relative aspect-square rounded-lg border-2 p-1 text-left transition-all hover:bg-muted/50 ${bordeUrgencia} ${
                seleccionado ? 'bg-primary/10 ring-2 ring-primary' : ''
              } ${esHoy ? 'font-bold' : ''}`}
            >
              <span className={`text-xs ${esHoy ? 'text-primary font-bold' : ''}`}>
                {dia}
              </span>
              {tieneVencimientos && (
                <div className="mt-0.5 flex flex-wrap gap-0.5">
                  {vencimientosDia.slice(0, 2).map(v => (
                    <span
                      key={v.modelo}
                      className={`inline-block h-1.5 w-1.5 rounded-full ${
                        v.categoria === 'iva' ? 'bg-blue-500'
                          : v.categoria === 'irpf' ? 'bg-green-500'
                            : v.categoria === 'retenciones' ? 'bg-orange-500'
                              : v.categoria === 'renta' ? 'bg-red-500'
                                : 'bg-gray-500'
                      }`}
                      title={v.descripcion}
                    />
                  ))}
                  {vencimientosDia.length > 2 && (
                    <span className="text-[8px] text-muted-foreground">+{vencimientosDia.length - 2}</span>
                  )}
                </div>
              )}
            </button>
          )
        })}
      </div>

      {/* Leyenda */}
      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
        {Object.entries(COLORES_CATEGORIA).filter(([k]) => k !== 'otros').map(([cat, color]) => (
          <div key={cat} className="flex items-center gap-1">
            <span className={`inline-block h-2 w-2 rounded-full ${
              cat === 'iva' ? 'bg-blue-500'
                : cat === 'irpf' ? 'bg-green-500'
                  : cat === 'retenciones' ? 'bg-orange-500'
                    : 'bg-red-500'
            }`} />
            <span className="capitalize">{cat}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

interface PanelDiaProps {
  dia: number | null
  anyo: number
  mes: number
  vencimientos: FechaFiscal[]
}

export function PanelDia({ dia, anyo, mes, vencimientos }: PanelDiaProps) {
  if (dia === null) {
    return (
      <div className="rounded-lg border bg-muted/30 p-4 text-center text-sm text-muted-foreground">
        Selecciona un día para ver los vencimientos
      </div>
    )
  }

  const fechaSeleccionada = new Date(anyo, mes, dia)
  const hoy = new Date()
  const hoyUtc = Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth(), hoy.getUTCDate())

  const vencimientosDia = vencimientos
    .filter(v => {
      const f = v.fechaLimite instanceof Date ? v.fechaLimite : new Date(v.fechaLimite)
      return f.getFullYear() === anyo && f.getMonth() === mes && f.getDate() === dia
    })
    .map(v => {
      const f = v.fechaLimite instanceof Date ? v.fechaLimite : new Date(v.fechaLimite)
      const diasRestantes = Math.round((f.getTime() - hoyUtc) / (1000 * 60 * 60 * 24))
      return { ...v, diasRestantes }
    })
    .sort((a, b) => a.diasRestantes - b.diasRestantes)

  const fechaTexto = fechaSeleccionada.toLocaleDateString('es-ES', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  })

  return (
    <div className="space-y-3">
      <h4 className="font-heading font-semibold capitalize">{fechaTexto}</h4>
      {vencimientosDia.length === 0 ? (
        <p className="text-sm text-muted-foreground">Sin vencimientos este día</p>
      ) : (
        <ul className="space-y-2">
          {vencimientosDia.map(v => {
            const numeroModelo = v.modelo.replace(/^MOD/, '').replace(/-Q\d/, '')
            return (
              <li key={v.modelo} className="flex items-start justify-between rounded-lg border p-3">
                <div className="flex items-start gap-3">
                  <span className={`mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    v.categoria === 'iva' ? 'bg-blue-100 text-blue-700'
                      : v.categoria === 'irpf' ? 'bg-green-100 text-green-700'
                        : v.categoria === 'retenciones' ? 'bg-orange-100 text-orange-700'
                          : 'bg-red-100 text-red-700'
                  }`}>
                    {numeroModelo}
                  </span>
                  <div>
                    <p className="text-sm font-medium">{v.descripcion}</p>
                    <p className="text-xs text-muted-foreground">
                      {v.diasRestantes === 0 ? (
                        <span className="text-destructive font-medium">Vence hoy</span>
                      ) : v.diasRestantes === 1 ? (
                        <span className="text-yellow-600 font-medium">Vence mañana</span>
                      ) : (
                        `${v.diasRestantes} días restantes`
                      )}
                    </p>
                  </div>
                </div>
                <Link href={`/fiscal?seccion=modelo${numeroModelo}`}>
                  <Button variant="ghost" size="sm" className="shrink-0">Abrir</Button>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
