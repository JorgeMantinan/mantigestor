'use client'

import { useState, useMemo, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { TrendingUp, TrendingDown, Minus, Info, BarChart3 } from 'lucide-react'
import { useLanguage } from '@/contexts/language-context'
import { usePersonaActiva } from '@/contexts/persona-activa-context'
import { createClient } from '@/lib/supabase/client'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend,
} from 'recharts'

const SECTORES: Record<string, { label: string; ingresos: number; gastos: number; margen: number; horasSemanales: number }> = {
  tecnologia: { label: 'Tecnología', ingresos: 85000, gastos: 38000, margen: 55, horasSemanales: 38 },
  consultoria: { label: 'Consultoría', ingresos: 72000, gastos: 22000, margen: 69, horasSemanales: 40 },
  comercio: { label: 'Comercio', ingresos: 65000, gastos: 39000, margen: 40, horasSemanales: 42 },
  hosteleria: { label: 'Hostelería', ingresos: 58000, gastos: 32000, margen: 45, horasSemanales: 45 },
  construccion: { label: 'Construcción', ingresos: 78000, gastos: 39000, margen: 50, horasSemanales: 43 },
  servicios: { label: 'Servicios', ingresos: 60000, gastos: 21000, margen: 65, horasSemanales: 39 },
  profesionales: { label: 'Profesionales liberales', ingresos: 68000, gastos: 17000, margen: 75, horasSemanales: 37 },
}

function formatEuro(v: number): string {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(v)
}

export default function BenchmarkingPage() {
  const { t: _t } = useLanguage()
  const { perfilActivoId } = usePersonaActiva()
  const [sector, setSector] = useState('servicios')
  const [facturas, setFacturas] = useState<{ tipo: string; baseImponible: number; total: number; fechaEmision: string }[]>([])
  const [_cargando, setCargando] = useState(true)

  useEffect(() => {
    if (!perfilActivoId) return
    const ahora = new Date()
    const inicioAnio = `${ahora.getFullYear()}-01-01`
    createClient()
      .from('facturas')
      .select('tipo, baseImponible, total, fechaEmision')
      .eq('perfilId', perfilActivoId)
      .gte('fechaEmision', inicioAnio)
      .then(({ data }) => {
        setFacturas((data ?? []))
        setCargando(false)
      })
  }, [perfilActivoId])

  const statsUsuario = useMemo(() => {
    const ingresos = facturas.filter(f => f.tipo === 'ingreso')
    const gastos = facturas.filter(f => f.tipo === 'gasto')
    const totalIngresos = ingresos.reduce((s, f) => s + f.baseImponible, 0)
    const totalGastos = gastos.reduce((s, f) => s + f.baseImponible, 0)
    const margen = totalIngresos > 0 ? ((totalIngresos - totalGastos) / totalIngresos) * 100 : 0
    const mesesConDatos = new Set(ingresos.map(f => f.fechaEmision.slice(0, 7))).size
    const promedioMensual = mesesConDatos > 0 ? totalIngresos / mesesConDatos : 0

    return { totalIngresos, totalGastos, margen, promedioMensual, mesesConDatos }
  }, [facturas])

  const sectorData = SECTORES[sector] ?? SECTORES.servicios!

  const comparativas = useMemo(() => {
    return [
      {
        label: 'Ingresos anuales',
        valor: statsUsuario.totalIngresos,
        media: sectorData.ingresos,
        unidad: '€',
        mejor: statsUsuario.totalIngresos >= sectorData.ingresos,
        tipo: 'ingresos' as const,
      },
      {
        label: 'Gastos anuales',
        valor: statsUsuario.totalGastos,
        media: sectorData.gastos,
        unidad: '€',
        mejor: statsUsuario.totalGastos <= sectorData.gastos,
        tipo: 'gastos' as const,
      },
      {
        label: 'Margen de beneficio',
        valor: Math.round(statsUsuario.margen),
        media: sectorData.margen,
        unidad: '%',
        mejor: statsUsuario.margen >= sectorData.margen,
        tipo: 'margen' as const,
      },
    ]
  }, [statsUsuario, sectorData])

  const insights = useMemo(() => {
    const msgs: { texto: string; tipo: 'bueno' | 'malo' | 'neutral' }[] = []
    if (statsUsuario.totalIngresos > 0) {
      if (statsUsuario.totalIngresos > sectorData.ingresos) {
        msgs.push({ texto: `Tus ingresos superan la media del sector en ${formatEuro(statsUsuario.totalIngresos - sectorData.ingresos)}`, tipo: 'bueno' })
      } else if (statsUsuario.totalIngresos < sectorData.ingresos) {
        msgs.push({ texto: `Tus ingresos están ${formatEuro(sectorData.ingresos - statsUsuario.totalIngresos)} por debajo de la media`, tipo: 'malo' })
      } else {
        msgs.push({ texto: 'Tus ingresos coinciden con la media del sector', tipo: 'neutral' })
      }

      if (statsUsuario.margen > sectorData.margen) {
        msgs.push({ texto: `Tu margen de beneficio es ${Math.round(statsUsuario.margen - sectorData.margen)} puntos superior a la media`, tipo: 'bueno' })
      } else if (statsUsuario.margen < sectorData.margen) {
        msgs.push({ texto: `Tu margen está ${Math.round(sectorData.margen - statsUsuario.margen)} puntos por debajo de la media`, tipo: 'malo' })
      }
    }
    return msgs
  }, [statsUsuario, sectorData])

  const radarData = useMemo(() => {
    return [
      { subject: 'Ingresos', usuario: statsUsuario.totalIngresos > 0 ? Math.min((statsUsuario.totalIngresos / sectorData.ingresos) * 100, 150) : 0, media: 100 },
      { subject: 'Margen', usuario: statsUsuario.margen, media: sectorData.margen },
      { subject: 'Gastos (inv)', usuario: statsUsuario.totalGastos > 0 ? Math.max(100 - (statsUsuario.totalGastos / sectorData.gastos) * 100, 0) : 50, media: 100 },
    ]
  }, [statsUsuario, sectorData])

  const barData = useMemo(() => {
    return Object.entries(SECTORES).map(([key, s]) => ({
      name: s.label,
      ingresos: s.ingresos,
      ...(key === sector ? { tu: statsUsuario.totalIngresos } : {}),
    }))
  }, [sector, statsUsuario.totalIngresos])

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Comparativa con la media</h1>
          <p className="text-muted-foreground">Benchmarking de tu actividad vs. la media de tu sector</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Sector</Label>
          <select
            value={sector}
            onChange={(e) => setSector(e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {Object.entries(SECTORES).map(([key, s]) => (
              <option key={key} value={key}>{s.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Tus ingresos anuales</CardDescription>
          </CardHeader>
          <CardContent>
            <span className="text-2xl font-bold">{formatEuro(statsUsuario.totalIngresos)}</span>
            <p className="text-xs text-muted-foreground mt-1">Media sector: {formatEuro(sectorData.ingresos)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Tus gastos anuales</CardDescription>
          </CardHeader>
          <CardContent>
            <span className="text-2xl font-bold">{formatEuro(statsUsuario.totalGastos)}</span>
            <p className="text-xs text-muted-foreground mt-1">Media sector: {formatEuro(sectorData.gastos)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Tu margen</CardDescription>
          </CardHeader>
          <CardContent>
            <span className="text-2xl font-bold">{Math.round(statsUsuario.margen)}%</span>
            <p className="text-xs text-muted-foreground mt-1">Media sector: {sectorData.margen}%</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <BarChart3 className="h-4 w-4" /> Ingresos por sector
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-30} textAnchor="end" height={80} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(value: number) => formatEuro(value)} />
                  <Bar dataKey="ingresos" fill="#8884d8" name="Media sector" />
                  <Bar dataKey="tu" fill="#22c55e" name="Tú" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Info className="h-4 w-4" /> Radar comparativo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="subject" />
                  <PolarRadiusAxis angle={30} domain={[0, 150]} />
                  <Radar name="Tú" dataKey="usuario" stroke="#22c55e" fill="#22c55e" fillOpacity={0.3} />
                  <Radar name="Media sector" dataKey="media" stroke="#8884d8" fill="#8884d8" fillOpacity={0.15} />
                  <Legend />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Comparativa detallada</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {comparativas.map(c => {
              const diff = c.tipo === 'margen'
                ? c.valor - c.media
                : c.valor - c.media
              const Icon = diff > 0 ? TrendingUp : diff < 0 ? TrendingDown : Minus
              const color = c.mejor ? 'text-green-600' : 'text-red-600'

              return (
                <div key={c.label}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-muted-foreground">{c.label}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {c.tipo === 'margen' ? `${c.valor}%` : formatEuro(c.valor)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        vs {c.tipo === 'margen' ? `${c.media}%` : formatEuro(c.media)}
                      </span>
                    </div>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden relative">
                    <div
                      className="absolute h-full bg-muted-foreground/30 rounded-full"
                      style={{ width: `${Math.min(c.tipo === 'margen' ? c.media : (c.media / Math.max(c.valor, c.media, 1)) * 100, 100)}%` }}
                    />
                    <div
                      className={`absolute h-full rounded-full ${c.mejor ? 'bg-green-500' : 'bg-red-500'}`}
                      style={{ width: `${Math.min(c.tipo === 'margen' ? c.valor : (c.valor / Math.max(c.valor, c.media, 1)) * 100, 100)}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-[10px] text-muted-foreground">0</span>
                    <div className={`flex items-center gap-0.5 text-xs ${color}`}>
                      <Icon className="h-3 w-3" />
                      {diff > 0 ? '+' : ''}{c.tipo === 'margen' ? `${diff}%` : formatEuro(diff)}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {insights.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Insights</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {insights.map((insight, i) => (
                <div
                  key={i}
                  className={`rounded-lg border p-3 text-sm ${
                    insight.tipo === 'bueno'
                      ? 'border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-800'
                      : insight.tipo === 'malo'
                      ? 'border-red-200 bg-red-50 dark:bg-red-950 dark:border-red-800'
                      : 'bg-muted'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {insight.tipo === 'bueno' ? (
                      <TrendingUp className="h-4 w-4 text-green-600" />
                    ) : insight.tipo === 'malo' ? (
                      <TrendingDown className="h-4 w-4 text-red-600" />
                    ) : (
                      <Minus className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span>{insight.texto}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start gap-2">
            <Info className="h-4 w-4 text-muted-foreground mt-0.5" />
            <p className="text-xs text-muted-foreground">
              Los datos de media por sector son estimaciones basadas en datos públicos del INE y AEAT.
              Para un análisis más preciso, consulta con tu asesor fiscal.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
