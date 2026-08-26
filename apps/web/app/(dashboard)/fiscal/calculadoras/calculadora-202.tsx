'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { LabelConAyuda } from './label-con-ayuda'
import { calcularModelo202 } from '@mantigestor/utils'
import { eur } from './types'

interface Props {
  taxYear: number
}

export function Calculadora202({ taxYear }: Props) {
  const [tipoContribuyente, setTipoContribuyente] = useState<'nuevo' | 'general' | 'reducida_dimencion'>('general')
  const [cuotaIntegra, setCuotaIntegra] = useState('')
  const [baseImponible, setBaseImponible] = useState('')
  const [pagosAnteriores, setPagosAnteriores] = useState('')

  const resultado = useMemo(() => {
    try {
      return calcularModelo202({
        tipoContribuyente,
        cuotaIntegraUltimoPeriodoCents: Math.round((parseFloat(cuotaIntegra) || 0) * 100),
        baseImponibleTrimestreCents: Math.round((parseFloat(baseImponible) || 0) * 100),
        pagosAnterioresCents: Math.round((parseFloat(pagosAnteriores) || 0) * 100),
      })
    } catch {
      return null
    }
  }, [tipoContribuyente, cuotaIntegra, baseImponible, pagosAnteriores])

  return (
    <Card>
      <CardHeader>
        <CardTitle>Modelo 202 — Pago fraccionado sociedades {taxYear}</CardTitle>
        <CardDescription>
          Declaración trimestral del Impuesto sobre Sociedades. Art. 40 LIS.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <LabelConAyuda
              htmlFor="s202-tipo"
              ayuda={{
                titulo: 'Tipo de contribuyente',
                contenido: 'General: 5% sobre cuota íntegra del último periodo. Reducida dimensión: 17%. Nuevo contribuyente: 18% sobre base imponible trimestre.',
              }}
            >
              Tipo de contribuyente
            </LabelConAyuda>
            <select
              id="s202-tipo"
              value={tipoContribuyente}
              onChange={e => setTipoContribuyente(e.target.value as typeof tipoContribuyente)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="general">General (5% cuota íntegra)</option>
              <option value="reducida_dimencion">Reducida dimensión (17% cuota íntegra)</option>
              <option value="nuevo">Nuevo contribuyente (18% base imponible)</option>
            </select>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {tipoContribuyente !== 'nuevo' ? (
            <div className="space-y-2">
              <LabelConAyuda
                htmlFor="s202-cuota"
                ayuda={{
                  titulo: 'Cuota íntegra último periodo',
                  contenido: 'Cuota íntegra resultante de la última declaración del impuesto presentada.',
                }}
              >
                Cuota íntegra último periodo (€)
              </LabelConAyuda>
              <Input
                id="s202-cuota"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={cuotaIntegra}
                onChange={e => setCuotaIntegra(e.target.value)}
              />
            </div>
          ) : (
            <div className="space-y-2">
              <LabelConAyuda
                htmlFor="s202-base"
                ayuda={{
                  titulo: 'Base imponible trimestre',
                  contenido: 'Base imponible del trimestre para nuevos contribuyentes (Art. 40.3 LIS).',
                }}
              >
                Base imponible trimestre (€)
              </LabelConAyuda>
              <Input
                id="s202-base"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={baseImponible}
                onChange={e => setBaseImponible(e.target.value)}
              />
            </div>
          )}
          <div className="space-y-2">
            <LabelConAyuda
              htmlFor="s202-pagos"
              ayuda={{
                titulo: 'Pagos fraccionados anteriores',
                contenido: 'Suma de los pagos fraccionados ya realizados en trimestres anteriores del mismo año.',
              }}
            >
              Pagos anteriores del año (€)
            </LabelConAyuda>
            <Input
              id="s202-pagos"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={pagosAnteriores}
              onChange={e => setPagosAnteriores(e.target.value)}
            />
          </div>
        </div>

        {resultado && (
          <div className="rounded-lg border p-4 space-y-3">
            <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div className="rounded bg-muted/50 p-3">
                <dt className="text-xs text-muted-foreground">Tipo aplicable</dt>
                <dd className="text-sm font-medium">{resultado.tipoAplicable}</dd>
              </div>
              <div className="rounded bg-muted/50 p-3">
                <dt className="text-xs text-muted-foreground">Base de cálculo</dt>
                <dd className="text-lg font-bold">{eur(resultado.baseCalculoCents)}</dd>
              </div>
              <div className="rounded bg-muted/50 p-3">
                <dt className="text-xs text-muted-foreground">Pago trimestral</dt>
                <dd className="text-lg font-bold">{eur(resultado.pagoTrimestralCents)}</dd>
              </div>
              <div className="rounded bg-muted/50 p-3">
                <dt className="text-xs text-muted-foreground">Pagos anteriores</dt>
                <dd className="text-lg font-semibold">{eur(resultado.pagosAnterioresCents)}</dd>
              </div>
              <div className="rounded border border-primary/50 bg-primary/5 p-3">
                <dt className="text-xs text-muted-foreground">Total a pagar este trimestre</dt>
                <dd className="text-xl font-bold text-primary">{eur(resultado.totalAPagarCents)}</dd>
              </div>
              <div className="rounded bg-muted/50 p-3">
                <dt className="text-xs text-muted-foreground">Cuota anual estimada</dt>
                <dd className="text-lg font-semibold">{eur(resultado.cuotaAnualEstimadaCents)}</dd>
              </div>
            </dl>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
