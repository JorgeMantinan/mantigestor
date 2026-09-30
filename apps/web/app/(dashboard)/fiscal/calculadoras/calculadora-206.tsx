'use client'

import { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { eur, parseEuros } from './types'
import { LabelConAyuda } from './label-con-ayuda'
import { GUIA_MODELO_206 } from '@/lib/fiscal/guia-fiscal'
import { calcularModelo206, TRIMESTRES_206 } from '@mantigestor/utils'
import type { Trimestre206 } from '@mantigestor/utils'
import { BotonPDF } from '@/components/boton-pdf'

interface Props {
  taxYear: number
}

export function Calculadora206({ taxYear }: Props) {
  const [baseImponible, setBaseImponible] = useState('')
  const [tipoGravamen, setTipoGravamen] = useState('17')
  const [pagosAnteriores, setPagosAnteriores] = useState('')
  const [compensaciones, setCompensaciones] = useState('')

  const resultado = useMemo(() => {
    const base = parseEuros(baseImponible)
    if (base === null) return null
    return calcularModelo206({
      baseImponibleCents: Math.round(base * 100),
      tipoGravamenPct: parseFloat(tipoGravamen) || 17,
      pagosAnterioresCents: Math.round((parseEuros(pagosAnteriores) ?? 0) * 100),
      compensacionesPendientesCents: Math.round((parseEuros(compensaciones) ?? 0) * 100),
    })
  }, [baseImponible, tipoGravamen, pagosAnteriores, compensaciones])

  return (
    <div id="pdf-modelo-206" className="space-y-3">
      <BotonPDF elementId="pdf-modelo-206" filename="modelo-206" />
      <Card>
      <CardHeader>
        <CardTitle>Modelo 206 — Pagos fraccionados sociedades {taxYear}</CardTitle>
        <CardDescription>
          Declaración trimestral de pagos fraccionados sobre la base imponible del ejercicio corriente.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <LabelConAyuda htmlFor="m206-base" ayuda={GUIA_MODELO_206.baseImponible}>Base imponible (€)</LabelConAyuda>
            <Input id="m206-base" type="number" step="0.01" value={baseImponible} onChange={e => setBaseImponible(e.target.value)} placeholder="0.00" />
          </div>
          <div className="space-y-2">
            <LabelConAyuda htmlFor="m206-tipo" ayuda={GUIA_MODELO_206.tipoGravamen}>Tipo de gravamen (%)</LabelConAyuda>
            <Input id="m206-tipo" type="number" step="0.01" value={tipoGravamen} onChange={e => setTipoGravamen(e.target.value)} placeholder="18" />
          </div>
          <div className="space-y-2">
            <LabelConAyuda htmlFor="m206-pagos" ayuda={GUIA_MODELO_206.pagosAnteriores}>Pagos fraccionados anteriores (€)</LabelConAyuda>
            <Input id="m206-pagos" type="number" step="0.01" value={pagosAnteriores} onChange={e => setPagosAnteriores(e.target.value)} placeholder="0.00" />
          </div>
          <div className="space-y-2">
            <LabelConAyuda htmlFor="m206-compensaciones" ayuda={GUIA_MODELO_206.compensaciones}>Compensaciones bases negativas (€)</LabelConAyuda>
            <Input id="m206-compensaciones" type="number" step="0.01" value={compensaciones} onChange={e => setCompensaciones(e.target.value)} placeholder="0.00" />
          </div>
        </div>

        {resultado && (
          <>
            <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-lg border p-3">
                <dt className="text-xs text-muted-foreground">Tipo aplicable</dt>
                <dd className="text-sm font-semibold">{resultado.tipoAplicable}</dd>
              </div>
              <div className="rounded-lg border p-3">
                <dt className="text-xs text-muted-foreground">Cuota íntegra total</dt>
                <dd className="text-lg font-bold">{eur(resultado.cuotaIntegraTotalCents)}</dd>
              </div>
              <div className="rounded-lg border p-3">
                <dt className="text-xs text-muted-foreground">Compensaciones</dt>
                <dd className="text-lg font-semibold">{eur(resultado.compensacionesCents)}</dd>
              </div>
              <div className="rounded-lg border p-3">
                <dt className="text-xs text-muted-foreground">Cuota líquida</dt>
                <dd className="text-lg font-semibold">{eur(resultado.cuotaLiquidaCents)}</dd>
              </div>
              <div className="rounded-lg border p-3">
                <dt className="text-xs text-muted-foreground">Pagos anteriores</dt>
                <dd className="text-lg font-semibold">{eur(resultado.pagosAnterioresCents)}</dd>
              </div>
              <div className={`rounded-lg border p-3 ${resultado.totalAPagarCents > 0 ? 'border-red-500/50 bg-red-500/5' : 'border-green-500/50 bg-green-500/5'}`}>
                <dt className="text-xs text-muted-foreground">Resultado</dt>
                <dd className={`text-lg font-bold ${resultado.totalAPagarCents > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {resultado.totalAPagarCents > 0
                    ? `${eur(resultado.totalAPagarCents)} a ingresar`
                    : `${eur(resultado.totalADevolverCents)} a devolver`}
                </dd>
              </div>
            </dl>

            <div className="rounded-lg border overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-3 py-2 text-left font-medium">Trimestre</th>
                    <th className="px-3 py-2 text-right font-medium">Base trimestre</th>
                    <th className="px-3 py-2 text-right font-medium">Tipo</th>
                    <th className="px-3 py-2 text-right font-medium">Cuota íntegra</th>
                    <th className="px-3 py-2 text-right font-medium">Retenciones</th>
                    <th className="px-3 py-2 text-right font-medium">Resultado</th>
                  </tr>
                </thead>
                <tbody>
                  {resultado.trimestres.map(t => (
                    <tr key={t.trimestre} className="border-b last:border-0">
                      <td className="px-3 py-2 font-medium">T{t.trimestre}</td>
                      <td className="px-3 py-2 text-right">{eur(t.baseTrimestreCents)}</td>
                      <td className="px-3 py-2 text-right">{t.tipoPct}%</td>
                      <td className="px-3 py-2 text-right">{eur(t.cuotaIntegraCents)}</td>
                      <td className="px-3 py-2 text-right">{eur(t.retencionesTrimestreCents)}</td>
                      <td className="px-3 py-2 text-right font-medium">
                        {eur(t.resultadoTrimestreCents)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {resultado.avisos.length > 0 && (
              <div className="space-y-1">
                {resultado.avisos.map((aviso, i) => (
                  <p key={i} className="text-xs text-muted-foreground">• {aviso}</p>
                ))}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
    </div>
  )
}
