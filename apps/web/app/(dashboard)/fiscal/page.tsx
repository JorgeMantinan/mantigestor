'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Calculator, AlertTriangle, Info } from 'lucide-react'

const COMUNIDADES = [
  'Andalucía',
  'Aragón',
  'Asturias (Principado de)',
  'Balears (Illes)',
  'Canarias',
  'Cantabria',
  'Castilla-La Mancha',
  'Castilla y León',
  'Cataluña',
  'Comunitat Valenciana',
  'Extremadura',
  'Galicia',
  'Madrid (Comunidad de)',
  'Murcia (Región de)',
  'Navarra (Comunidad Foral de)',
  'País Vasco',
  'La Rioja',
  'Ceuta',
  'Melilla',
]

interface DetalleTramo {
  tramo: number
  desdeCentimos: number
  hastaCentimos: number | null
  baseTramoCentimos: number
  tipoPct: number
  cuotaTramoCentimos: number
}

interface ResultadoIrpf {
  comunidad: string
  regimen: string
  taxYear: number
  baseLiquidableCentimos: number
  cuotaEstatalCentimos: number
  tipoMedioEstatalPct: number
  cuotaAutonomicaCentimos: number
  tipoMedioAutonomicoPct: number
  cuotaIntegraCentimos: number
  tipoMedioCombinadoPct: number
  detalleEstatal: DetalleTramo[]
  detalleAutonomico: DetalleTramo[]
  datosVerificados: boolean
}

const eur = (centimos: number) =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(centimos / 100)

export default function FiscalPage() {
  const [comunidad, setComunidad] = useState('Madrid (Comunidad de)')
  const [baseLiquidable, setBaseLiquidable] = useState('')
  const [resultado, setResultado] = useState<ResultadoIrpf | null>(null)
  const [avisos, setAvisos] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [calculando, setCalculando] = useState(false)

  async function calcular(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setAvisos([])

    const base = parseFloat(baseLiquidable.replace(',', '.'))
    if (!baseLiquidable.trim() || Number.isNaN(base) || base < 0) {
      setError('Introduce una base liquidable válida (importe en euros)')
      return
    }

    setCalculando(true)
    try {
      const res = await fetch('/api/fiscal/irpf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comunidad, baseLiquidableEur: base, taxYear: 2025 }),
      })
      const json = await res.json()

      if (!res.ok) {
        if (json.avisos && Array.isArray(json.avisos)) setAvisos(json.avisos)
        setError(json.error ?? 'No se pudo calcular el IRPF. Inténtalo de nuevo.')
        setResultado(null)
        return
      }

      setResultado(json.data as ResultadoIrpf)
      setAvisos(Array.isArray(json.avisos) ? json.avisos : [])
    } catch {
      setError('Error de conexión. Comprueba tu conexión a internet e inténtalo de nuevo.')
      setResultado(null)
    } finally {
      setCalculando(false)
    }
  }

  function TablaDetalle({ titulo, detalle }: { titulo: string; detalle: DetalleTramo[] }) {
    if (!detalle.length) return null
    return (
      <div className="mt-4">
        <p className="text-sm font-medium mb-2">{titulo}</p>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-muted-foreground border-b">
              <th className="py-1 font-normal">Tramo</th>
              <th className="py-1 font-normal">Base gravada</th>
              <th className="py-1 font-normal">Tipo</th>
              <th className="py-1 font-normal text-right">Cuota</th>
            </tr>
          </thead>
          <tbody>
            {detalle.map(t => (
              <tr key={t.tramo} className="border-b last:border-0">
                <td className="py-1">{t.tramo}</td>
                <td className="py-1">{eur(t.baseTramoCentimos)}</td>
                <td className="py-1">{t.tipoPct.toLocaleString('es-ES')}%</td>
                <td className="py-1 text-right">{eur(t.cuotaTramoCentimos)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Calculadora de IRPF</h1>
        <p className="text-muted-foreground">
          Estimación de la cuota íntegra IRPF 2025 (escala estatal + autonómica).
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Datos de la consulta</CardTitle>
          <CardDescription>Base liquidable general antes de aplicar mínimos y deducciones.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={calcular} className="grid gap-4 sm:grid-cols-[2fr_1fr_auto] sm:items-end">
            <div className="space-y-2">
              <Label htmlFor="comunidad">Comunidad autónoma</Label>
              <select
                id="comunidad"
                value={comunidad}
                onChange={e => setComunidad(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
              >
                {COMUNIDADES.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="base">Base liquidable (€)</Label>
              <Input
                id="base"
                type="number"
                min="0"
                step="0.01"
                placeholder="25000"
                value={baseLiquidable}
                onChange={e => setBaseLiquidable(e.target.value)}
                disabled={calculando}
              />
            </div>
            <Button type="submit" disabled={calculando} className="gap-2">
              <Calculator className="h-4 w-4" aria-hidden="true" />
              {calculando ? 'Calculando...' : 'Calcular'}
            </Button>
          </form>

          {error && (
            <p role="alert" className="mt-4 text-sm text-destructive">{error}</p>
          )}

          {avisos.length > 0 && (
            <ul className="mt-4 space-y-1 rounded-md border border-yellow-500/40 bg-yellow-500/10 p-3 text-sm text-yellow-700 dark:text-yellow-400">
              {avisasOLi(avisos)}
            </ul>
          )}
        </CardContent>
      </Card>

      {resultado && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Resultado · {resultado.comunidad}</CardTitle>
              <CardDescription>
                Ejercicio {resultado.taxYear} · Régimen {resultado.regimen.toLowerCase()}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <dl className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg border p-3">
                  <dt className="text-xs text-muted-foreground">Cuota estatal</dt>
                  <dd className="text-lg font-semibold">{eur(resultado.cuotaEstatalCentimos)}</dd>
                  <dd className="text-xs text-muted-foreground">Tipo medio {resultado.tipoMedioEstatalPct}%</dd>
                </div>
                <div className="rounded-lg border p-3">
                  <dt className="text-xs text-muted-foreground">Cuota autonómica</dt>
                  <dd className="text-lg font-semibold">{eur(resultado.cuotaAutonomicaCentimos)}</dd>
                  <dd className="text-xs text-muted-foreground">Tipo medio {resultado.tipoMedioAutonomicoPct}%</dd>
                </div>
                <div className="rounded-lg border border-primary/50 bg-primary/5 p-3">
                  <dt className="text-xs text-muted-foreground">Cuota íntegra</dt>
                  <dd className="text-lg font-bold text-primary">{eur(resultado.cuotaIntegraCentimos)}</dd>
                  <dd className="text-xs text-muted-foreground">Tipo medio {resultado.tipoMedioCombinadoPct}%</dd>
                </div>
              </dl>
              <p className="flex items-start gap-2 text-xs text-muted-foreground">
                <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" aria-hidden="true" />
                Sobre una base liquidable de {eur(resultado.baseLiquidableCentimos)}. No incluye
                mínimos personal y familiar, reducciones ni deducciones autonómicas.
              </p>

              <TablaDetalle titulo="Detalle escala estatal" detalle={resultado.detalleEstatal} />
              <TablaDetalle titulo="Detalle escala autonómica" detalle={resultado.detalleAutonomico} />

              {!resultado.datosVerificados && (
                <p className="flex items-center gap-2 text-xs text-yellow-600 dark:text-yellow-400">
                  <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
                  Datos pendientes de verificación oficial: no utilizar en declaraciones reales.
                </p>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}

function avisasOLi(avisos: string[]) {
  return avisos.map((a, i) => (
    <li key={i} className="flex items-start gap-2">
      <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
      <span>{a}</span>
    </li>
  ))
}
