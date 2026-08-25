'use client'

import { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { seleccionarTramoReta, estimarCuotaReta } from '@mantigestor/utils'
import { eur, parseEuros, type DatosFiscales } from './types'

export function CalculadoraReta({ datos }: { datos: DatosFiscales }) {
  const [rendimiento, setRendimiento] = useState('')

  const estimacion = useMemo(() => {
    const cantidad = parseEuros(rendimiento)
    if (cantidad === null || !datos.tramosReta.length) return null
    try {
      const tramo = seleccionarTramoReta(Math.round(cantidad * 100), datos.tramosReta)
      const pct = datos.cotizacionRetaPct ?? 31.5
      return estimarCuotaReta(tramo, pct)
    } catch {
      return null
    }
  }, [rendimiento, datos.tramosReta, datos.cotizacionRetaPct])

  return (
    <Card>
      <CardHeader>
        <CardTitle>RETA · cotización de autónomos {datos.tramosReta[0]?.tabla ?? ''}</CardTitle>
        <CardDescription>
          Base de cotización según rendimiento neto mensual y cuota estimada al tipo de referencia
          {datos.cotizacionRetaPct != null ? ` (${datos.cotizacionRetaPct}%)` : ''}.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="max-w-xs space-y-2">
          <Label htmlFor="rendimiento-retas">Rendimiento neto mensual (€)</Label>
          <Input
            id="rendimiento-retas"
            type="number"
            min="0"
            step="0.01"
            placeholder="1500"
            value={rendimiento}
            onChange={e => setRendimiento(e.target.value)}
          />
        </div>

        {estimacion && (
          <dl className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border p-3">
              <dt className="text-xs text-muted-foreground">Base mínima</dt>
              <dd className="text-lg font-semibold">{eur(estimacion.baseMinimaCentimos)}</dd>
            </div>
            <div className="rounded-lg border p-3">
              <dt className="text-xs text-muted-foreground">Base máxima</dt>
              <dd className="text-lg font-semibold">
                {estimacion.baseMaximaCentimos === null ? '—' : eur(estimacion.baseMaximaCentimos)}
              </dd>
            </div>
            <div className="rounded-lg border border-primary/50 bg-primary/5 p-3">
              <dt className="text-xs text-muted-foreground">Cuota estimada ({datos.cotizacionRetaPct ?? 31.5}%)</dt>
              <dd className="text-lg font-bold text-primary">
                {estimacion.cuotaEstimadaMinCentimos === null
                  ? '—'
                  : `${eur(estimacion.cuotaEstimadaMinCentimos)}${estimacion.cuotaEstimadaMaxCentimos !== null ? ` – ${eur(estimacion.cuotaEstimadaMaxCentimos)}` : ''}`}
              </dd>
            </div>
          </dl>
        )}

        <details className="rounded-md border">
          <summary className="cursor-pointer px-3 py-2 text-sm font-medium">Ver tabla completa de tramos</summary>
          <table className="w-full text-sm px-3 pb-3">
            <thead>
              <tr className="text-left text-muted-foreground border-b">
                <th className="py-1 font-normal">Rendimiento neto/mes</th>
                <th className="py-1 font-normal">Base mín.</th>
                <th className="py-1 font-normal">Base máx.</th>
                <th className="py-1 font-normal text-right">Cuota ref. mín.</th>
              </tr>
            </thead>
            <tbody>
              {[...datos.tramosReta].sort((a, b) => a.tramo - b.tramo).map(t => (
                <tr key={t.tramo} className="border-b last:border-0">
                  <td className="py-1">
                    {t.rendimientoNetoDesdeEur.toLocaleString('es-ES')} €
                    {t.rendimientoNetoHastaEur === null ? ' o más' : ` – ${t.rendimientoNetoHastaEur.toLocaleString('es-ES')} €`}
                  </td>
                  <td className="py-1">{eur(Math.round(t.baseMinimaEur * 100))}</td>
                  <td className="py-1">{t.baseMaximaEur === null ? '—' : eur(Math.round(t.baseMaximaEur * 100))}</td>
                  <td className="py-1 text-right">{t.cuotaMinimaRefEur === null ? '—' : eur(Math.round(t.cuotaMinimaRefEur * 100))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      </CardContent>
    </Card>
  )
}
