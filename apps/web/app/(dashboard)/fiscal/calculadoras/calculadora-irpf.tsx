'use client'

import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Calculator } from 'lucide-react'
import { calcularIrpf, type EscalaIrpf } from '@mantigestor/utils'
import { eur, parseEuros, type DatosFiscales } from './types'

interface DetalleTramo {
  tramo: number
  desdeCentimos: number
  hastaCentimos: number | null
  baseTramoCentimos: number
  tipoPct: number
  cuotaTramoCentimos: number
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

export function CalculadoraIrpf({
  datos,
  comunidad,
}: {
  datos: DatosFiscales
  comunidad: string
}) {
  const [baseLiquidable, setBaseLiquidable] = useState('')

  const resultado = useMemo(() => {
    const base = parseEuros(baseLiquidable)
    if (base === null || !datos.escalaEstatal || !datos.escalaAutonomica) return null
    try {
      return calcularIrpf(
        Math.round(base * 100),
        datos.escalaEstatal as EscalaIrpf,
        datos.escalaAutonomica as EscalaIrpf
      )
    } catch {
      return null
    }
  }, [baseLiquidable, datos.escalaEstatal, datos.escalaAutonomica])

  const sinEscalas = !datos.escalaEstatal || !datos.escalaAutonomica

  return (
    <Card>
      <CardHeader>
        <CardTitle>IRPF {datos.taxYear} · escala estatal + autonómica</CardTitle>
        <CardDescription>Cuota íntegra sobre la base liquidable, antes de mínimos y deducciones.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="max-w-xs space-y-2">
          <Label htmlFor="base-irpf">Base liquidable (€)</Label>
          <Input
            id="base-irpf"
            type="number"
            min="0"
            step="0.01"
            placeholder="25000"
            value={baseLiquidable}
            onChange={e => setBaseLiquidable(e.target.value)}
          />
        </div>

        {sinEscalas && (
          <p role="alert" className="text-sm text-destructive">
            No hay escala disponible para {comunidad}. Los territorios forales requieren escalas propias todavía no incluidas.
          </p>
        )}

        {resultado && (
          <>
            <dl className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg border p-3">
                <dt className="text-xs text-muted-foreground">Cuota estatal</dt>
                <dd className="text-lg font-semibold">{eur(resultado.estatal.cuotaTotalCentimos)}</dd>
                <dd className="text-xs text-muted-foreground">Tipo medio {resultado.estatal.tipoMedioPct}%</dd>
              </div>
              <div className="rounded-lg border p-3">
                <dt className="text-xs text-muted-foreground">Cuota autonómica</dt>
                <dd className="text-lg font-semibold">{eur(resultado.autonomica.cuotaTotalCentimos)}</dd>
                <dd className="text-xs text-muted-foreground">Tipo medio {resultado.autonomica.tipoMedioPct}%</dd>
              </div>
              <div className="rounded-lg border border-primary/50 bg-primary/5 p-3">
                <dt className="text-xs text-muted-foreground">Cuota íntegra</dt>
                <dd className="text-lg font-bold text-primary">{eur(resultado.cuotaIntegraCentimos)}</dd>
                <dd className="text-xs text-muted-foreground">
                  Tipo medio{' '}
                  {Number(((resultado.cuotaIntegraCentimos / Math.max(resultado.baseLiquidableCentimos, 1)) * 100).toFixed(2))}%
                </dd>
              </div>
            </dl>
            <TablaDetalle titulo="Detalle escala estatal" detalle={resultado.estatal.detalle} />
            <TablaDetalle titulo={`Detalle escala autonómica (${comunidad})`} detalle={resultado.autonomica.detalle} />
          </>
        )}

        {!resultado && !sinEscalas && (
          <Button disabled className="gap-2 opacity-60 cursor-default">
            <Calculator className="h-4 w-4" aria-hidden="true" />
            Introduce la base para calcular
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
