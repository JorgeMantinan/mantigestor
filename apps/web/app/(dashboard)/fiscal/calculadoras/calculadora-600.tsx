'use client'

import { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Scale } from 'lucide-react'
import { calcularModelo600, TIPO_GRAVAMEN_ITP_ORIENTATIVO } from '@mantigestor/utils'
import { LabelConAyuda } from './label-con-ayuda'
import { GUIA_MODELO_600 } from '@/lib/fiscal/guia-fiscal'
import { BotonPDF } from '@/components/boton-pdf'

const formatoEuros = (euros: number) =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(euros)

export function CalculadoraModelo600() {
  const [valorBien, setValorBien] = useState('')
  const [baseLiquidable, setBaseLiquidable] = useState('')
  const [tipoGravamen, setTipoGravamen] = useState(String(TIPO_GRAVAMEN_ITP_ORIENTATIVO))

  const resultado = useMemo(
    () =>
      calcularModelo600({
        valorBien: parseFloat(valorBien) || 0,
        baseLiquidable: baseLiquidable.trim() ? parseFloat(baseLiquidable) || 0 : undefined,
        tipoGravamenPct: tipoGravamen.trim() ? parseFloat(tipoGravamen) || 0 : undefined,
      }),
    [valorBien, baseLiquidable, tipoGravamen]
  )

  const hasData = parseFloat(valorBien) > 0

  return (
    <div id="pdf-modelo-600" className="space-y-3">
      <BotonPDF elementId="pdf-modelo-600" filename="modelo-600" />
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Scale className="h-5 w-5 text-primary" aria-hidden="true" />
            <div>
              <CardTitle>Modelo 600 — ITP / Actos Jurídicos Documentados</CardTitle>
              <CardDescription>
                Liquidación del Impuesto sobre Transmisiones Patrimoniales y Actos Jurídicos Documentados.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <LabelConAyuda htmlFor="m600-valor" ayuda={GUIA_MODELO_600.valorBien}>Valor del bien (€)</LabelConAyuda>
              <Input id="m600-valor" type="number" min="0" step="0.01" placeholder="200000" value={valorBien} onChange={e => setValorBien(e.target.value)} />
            </div>
            <div className="space-y-2">
              <LabelConAyuda htmlFor="m600-base" ayuda={GUIA_MODELO_600.baseLiquidable}>Base liquidable (€)</LabelConAyuda>
              <Input id="m600-base" type="number" min="0" step="0.01" placeholder="200000" value={baseLiquidable} onChange={e => setBaseLiquidable(e.target.value)} />
            </div>
            <div className="space-y-2">
              <LabelConAyuda htmlFor="m600-tipo" ayuda={GUIA_MODELO_600.tipoGravamen}>Tipo de gravamen (%)</LabelConAyuda>
              <Input id="m600-tipo" type="number" min="0" step="0.5" placeholder="6" value={tipoGravamen} onChange={e => setTipoGravamen(e.target.value)} />
            </div>
          </div>

          {hasData && (
            <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-lg border p-3">
                <dt className="text-xs text-muted-foreground">Valor del bien</dt>
                <dd className="text-lg font-semibold">{formatoEuros(resultado.valorBien)}</dd>
              </div>
              <div className="rounded-lg border p-3">
                <dt className="text-xs text-muted-foreground">Tipo de gravamen</dt>
                <dd className="text-lg font-semibold">{resultado.tipoGravamen}%</dd>
              </div>
              <div className="rounded-lg border p-3">
                <dt className="text-xs text-muted-foreground">Base liquidable</dt>
                <dd className="text-lg font-semibold">{formatoEuros(resultado.baseLiquidable)}</dd>
              </div>
              <div className="rounded-lg border border-primary/50 bg-primary/5 p-3">
                <dt className="text-xs text-muted-foreground">Cuota</dt>
                <dd className="text-lg font-bold text-primary">{formatoEuros(resultado.cuota)}</dd>
              </div>
            </dl>
          )}

          {!hasData && (
            <p className="text-sm text-muted-foreground">
              Introduce el valor del bien transmitido para calcular la cuota del impuesto.
            </p>
          )}

          <p className="text-xs text-muted-foreground">
            Cálculo orientativo con un 6% tipo general (vivienda usada). El tipo varía según la comunidad
            autónoma y el tipo de acto, documento u operación sujeto.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}