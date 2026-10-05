'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, AlertCircle, TrendingUp, TrendingDown, Loader2, ArrowRight } from 'lucide-react'
import { usePersonaActiva } from '@/contexts/persona-activa-context'
import { clasificarGastos, clasificarGasto, type NivelDeducibilidad } from '@/lib/fiscal/clasificar-gastos'
import Link from 'next/link'

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

function formatEuro(v: number): string {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(v / 100)
}

interface FacturaMes {
  id: string
  tipo: string
  emisorReceptor: string
  categoriaGasto: string | null
  baseImponible: number
  total: number
  deducible: boolean | null
  fechaEmision: string
}

interface StatsMes {
  mes: string
  totalGastado: number
  totalDeducible: number
  totalNoDeducible: number
}

export default function DeduccionesMesPage() {
  const { perfilActivoId } = usePersonaActiva()
  const [facturas, setFacturas] = useState<FacturaMes[]>([])
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [mesSeleccionado, setMesSeleccionado] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })
  const [statsMeses, setStatsMeses] = useState<StatsMes[]>([])

  const cargarFacturas = useCallback(async (perfilId: string, mes: string) => {
    const [anio, mesNum] = mes.split('-').map(Number) as [number, number]
    const inicio = `${anio}-${String(mesNum).padStart(2, '0')}-01`
    const finMes = new Date(anio, mesNum, 0).getDate()
    const fin = `${anio}-${String(mesNum).padStart(2, '0')}-${String(finMes).padStart(2, '0')}`

    const { data } = await createClient()
      .from('facturas')
      .select('id, tipo, emisorReceptor, categoriaGasto, baseImponible, total, deducible, fechaEmision')
      .eq('perfilId', perfilId)
      .eq('tipo', 'gasto')
      .gte('fechaEmision', inicio)
      .lte('fechaEmision', fin)
      .order('fechaEmision', { ascending: false })

    return (data ?? []) as FacturaMes[]
  }, [])

  useEffect(() => {
    if (!perfilActivoId) return
    setCargando(true)
    cargarFacturas(perfilActivoId, mesSeleccionado).then(facturas => {
      setFacturas(facturas)
      setCargando(false)
    })
  }, [perfilActivoId, mesSeleccionado, cargarFacturas])

  useEffect(() => {
    if (!perfilActivoId) return
    const cargarStats = async () => {
      const stats: StatsMes[] = []
      const now = new Date()
      for (let i = 0; i < 6; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const mes = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        const fs = await cargarFacturas(perfilActivoId, mes)
        const clasificacion = clasificarGastos(fs.map(f => ({
          emisorReceptor: f.emisorReceptor,
          categoriaGasto: f.categoriaGasto,
          baseImponible: f.baseImponible,
          deducible: f.deducible,
        })))
        stats.push({
          mes: `${MESES[d.getMonth()]} ${d.getFullYear()}`,
          totalGastado: clasificacion.totalGastado,
          totalDeducible: clasificacion.totalDeducible,
          totalNoDeducible: clasificacion.totalNoDeducible,
        })
      }
      setStatsMeses(stats)
    }
    cargarStats()
  }, [perfilActivoId, cargarFacturas])

  const clasificacion = useMemo(() => {
    return clasificarGastos(facturas.map(f => ({
      emisorReceptor: f.emisorReceptor,
      categoriaGasto: f.categoriaGasto,
      baseImponible: f.baseImponible,
      deducible: f.deducible,
    })))
  }, [facturas])

  const facturasSinClasificar = useMemo(() => {
    return facturas.filter(f => f.deducible === null || f.deducible === undefined)
  }, [facturas])

  const marcarDeducibles = async () => {
    if (!perfilActivoId || facturasSinClasificar.length === 0) return
    setGuardando(true)
    try {
      const updates = facturasSinClasificar.map(f => {
        const clasif = clasificarGasto(f.emisorReceptor, f.categoriaGasto)
        return createClient()
          .from('facturas')
          .update({ deducible: clasif.nivel !== 'no_deducible' })
          .eq('id', f.id)
      })
      await Promise.all(updates)
      setFacturas(prev =>
        prev.map(f => {
          if (f.deducible === null || f.deducible === undefined) {
            const clasif = clasificarGasto(f.emisorReceptor, f.categoriaGasto)
            return { ...f, deducible: clasif.nivel !== 'no_deducible' }
          }
          return f
        })
      )
    } catch { /* ignore */ }
    setGuardando(false)
  }

  const nivelBadge = (nivel: NivelDeducibilidad) => {
    switch (nivel) {
      case 'total':
        return <Badge variant="default" className="bg-green-600 hover:bg-green-700 text-xs">100%</Badge>
      case 'parcial':
        return <Badge variant="secondary" className="text-xs">Parcial</Badge>
      case 'no_deducible':
        return <Badge variant="destructive" className="text-xs">0%</Badge>
    }
  }

  const ahora = useMemo(() => new Date(), [])
  const opcionesMes = useMemo(() => {
    const opts: string[] = []
    for (let i = 0; i < 12; i++) {
      const d = new Date(ahora.getFullYear(), ahora.getMonth() - i, 1)
      opts.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
    }
    return opts
  }, [ahora])

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">¿Qué puedo deducir este mes?</h1>
          <p className="text-muted-foreground">Analiza tus gastos y descubre cuáles son deducibles fiscalmente</p>
        </div>
      </div>

      {/* Selector de mes */}
      <div className="flex items-center gap-4">
        <select
          value={mesSeleccionado}
          onChange={(e) => setMesSeleccionado(e.target.value)}
          className="flex h-10 w-full max-w-[200px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {opcionesMes.map(m => {
            const [a, mes] = m.split('-').map(Number) as [number, number]
            return <option key={m} value={m}>{MESES[mes - 1]} {a}</option>
          })}
        </select>
      </div>

      {cargando ? (
        <div className="grid gap-4 sm:grid-cols-3">
          {[1, 2, 3].map(i => (
            <Card key={i}>
              <CardContent className="pt-6">
                <div className="h-8 bg-muted animate-pulse rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <>
          {/* Resumen */}
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Total gastado</CardDescription>
              </CardHeader>
              <CardContent>
                <span className="text-2xl font-bold">{formatEuro(clasificacion.totalGastado)}</span>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Deducible</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" aria-hidden="true" />
                  <span className="text-2xl font-bold text-green-600">{formatEuro(clasificacion.totalDeducible)}</span>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>No deducible</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-red-600" aria-hidden="true" />
                  <span className="text-2xl font-bold text-red-600">{formatEuro(clasificacion.totalNoDeducible)}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Facturas por clasificar */}
          {facturasSinClasificar.length > 0 && (
            <Card className="border-orange-200 dark:border-orange-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-orange-500" />
                  {facturasSinClasificar.length} factura(s) sin clasificar
                </CardTitle>
                <CardDescription>
                  Estas facturas necesitan que les asignes el campo deducible
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={() => void marcarDeducibles()} disabled={guardando} size="sm">
                  {guardando ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle className="mr-2 h-4 w-4" />
                  )}
                  {guardando ? 'Guardando...' : 'Clasificar automáticamente'}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Desglose por categoría */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Desglose por categoría</CardTitle>
            </CardHeader>
            <CardContent>
              {clasificacion.desglose.length === 0 ? (
                <p className="text-sm text-muted-foreground">No hay gastos este mes</p>
              ) : (
                <div className="space-y-2">
                  {clasificacion.desglose.map((item, i) => (
                    <div key={i} className="flex items-center justify-between rounded-lg border p-3">
                      <div className="flex items-center gap-3">
                        {nivelBadge(item.clasificacion.nivel)}
                        <div>
                          <p className="text-sm font-medium">{item.clasificacion.categoriaGasto}</p>
                          <p className="text-xs text-muted-foreground">
                            {item.clasificacion.porcentajeDeducible}% deducible
                            {item.clasificacion.notas && ` — ${item.clasificacion.notas}`}
                          </p>
                        </div>
                      </div>
                      <span className="text-sm font-medium">{formatEuro(item.importe)}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Comparativa con meses anteriores */}
          {statsMeses.length > 1 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" /> Comparativa últimos 6 meses
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {statsMeses.map((s, i) => {
                    const pct = s.totalGastado > 0 ? (s.totalDeducible / s.totalGastado * 100).toFixed(0) : '0'
                    const prev = statsMeses[i + 1]
                    const diff = prev ? s.totalDeducible - prev.totalDeducible : 0
                    return (
                      <div key={s.mes} className="flex items-center justify-between rounded border p-2.5">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{s.mes}</span>
                            {diff !== 0 && (
                              <span className={`text-xs flex items-center gap-0.5 ${diff > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {diff > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                                {diff > 0 ? '+' : ''}{formatEuro(diff)}
                              </span>
                            )}
                          </div>
                          <div className="mt-1 h-2 w-full rounded-full bg-muted overflow-hidden">
                            <div
                              className="h-full bg-green-600 rounded-full"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                        <div className="ml-4 text-right">
                          <span className="text-sm font-medium text-green-600">{formatEuro(s.totalDeducible)}</span>
                          <span className="text-xs text-muted-foreground ml-1">({pct}%)</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Acción rápida */}
          <Card className="bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800">
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                    ¿Necesitas ver la lista completa de gastos deducibles?
                  </p>
                  <p className="text-xs text-blue-600 dark:text-blue-300">
                    Consulta nuestra guía completa de deducciones para autónomos
                  </p>
                </div>
                <Button variant="outline" size="sm" asChild className="shrink-0">
                  <Link href="/herramientas/gastos-deducibles">
                    Ver guía <ArrowRight className="ml-1 h-3 w-3" aria-hidden="true" />
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
