'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { calcularModelo194, porcentajeRetencion, type DetalleRetenciones194 } from '@mantigestor/utils'
import { eur, parseEuros } from './types'
import { BotonPDF } from '@/components/boton-pdf'
import { GUIA_MODELO_194 } from '@/lib/fiscal/guia-fiscal'
import { LabelConAyuda } from './label-con-ayuda'

interface Props {
  taxYear: number
}

export function Calculadora194({ taxYear }: Props) {
  const [base111, setBase111] = useState('')
  const [ret111, setRet111] = useState('')
  const [base115, setBase115] = useState('')
  const [ret115, setRet115] = useState('')
  const [base117, setBase117] = useState('')
  const [ret117, setRet117] = useState('')
  const [base123, setBase123] = useState('')
  const [ret123, setRet123] = useState('')

  const toCents = (v: string) => Math.round((parseEuros(v) ?? 0) * 100)

  const retenciones: DetalleRetenciones194 = {
    r111: { baseCents: toCents(base111), retencionCents: toCents(ret111) },
    r115: { baseCents: toCents(base115), retencionCents: toCents(ret115) },
    r117: { baseCents: toCents(base117), retencionCents: toCents(ret117) },
    r123: { baseCents: toCents(base123), retencionCents: toCents(ret123) },
  }

  const resultado = calcularModelo194(retenciones)

  return (
    <div id="pdf-modelo-194" className="space-y-3">
      <BotonPDF elementId="pdf-modelo-194" filename="modelo-194" />
      <Card>
        <CardHeader>
          <CardTitle>Modelo 194 — Resumen retenciones {taxYear}</CardTitle>
          <CardDescription>
            Resumen anual de retenciones e ingresos a cuenta (modelos 111, 115, 117, 123).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {resultado.totalBasesCents > 0 && (
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Total bases</p>
                <p className="text-lg font-bold">{eur(resultado.totalBasesCents)}</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Total retenciones</p>
                <p className="text-lg font-bold text-red-600">{eur(resultado.totalRetencionesCents)}</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Declaraciones con datos</p>
                <p className="text-lg font-bold">{resultado.numDeclaraciones}</p>
              </div>
            </div>
          )}

          <div className="rounded-lg border overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-3 py-2 text-left font-medium">Modelo</th>
                  <th className="px-3 py-2 text-right font-medium">Base imponible (€)</th>
                  <th className="px-3 py-2 text-right font-medium">Retención (€)</th>
                  <th className="px-3 py-2 text-right font-medium">Tipo %</th>
                </tr>
              </thead>
              <tbody>
                {resultado.desglosePorModelo.map((m) => {
                  const pct = porcentajeRetencion(m.baseCents, m.retencionCents)
                  return (
                    <tr key={m.modelo} className="border-b last:border-0">
                      <td className="px-3 py-2 font-medium">{m.modelo}</td>
                      <td className="px-3 py-2 text-right">{eur(m.baseCents)}</td>
                      <td className="px-3 py-2 text-right text-red-600">{eur(m.retencionCents)}</td>
                      <td className="px-3 py-2 text-right">{pct > 0 ? `${pct}%` : '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className="rounded-lg border p-4 space-y-4">
            <p className="text-sm font-medium">Introducir datos por modelo</p>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Modelo 111 — Rendimientos trabajo/profesionales</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="space-y-1">
                    <LabelConAyuda htmlFor="m194-base111" ayuda={GUIA_MODELO_194.baseImponible111}>Base imponible (€)</LabelConAyuda>
                    <Input id="m194-base111" type="number" step="0.01" value={base111} onChange={e => setBase111(e.target.value)} placeholder="0" />
                  </div>
                  <div className="space-y-1">
                    <LabelConAyuda htmlFor="m194-ret111" ayuda={GUIA_MODELO_194.retencion111}>Retención (€)</LabelConAyuda>
                    <Input id="m194-ret111" type="number" step="0.01" value={ret111} onChange={e => setRet111(e.target.value)} placeholder="0" />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Modelo 115 — Arrendamiento inmuebles</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="space-y-1">
                    <LabelConAyuda htmlFor="m194-base115" ayuda={GUIA_MODELO_194.baseImponible115}>Base imponible (€)</LabelConAyuda>
                    <Input id="m194-base115" type="number" step="0.01" value={base115} onChange={e => setBase115(e.target.value)} placeholder="0" />
                  </div>
                  <div className="space-y-1">
                    <LabelConAyuda htmlFor="m194-ret115" ayuda={GUIA_MODELO_194.retencion115}>Retención (€)</LabelConAyuda>
                    <Input id="m194-ret115" type="number" step="0.01" value={ret115} onChange={e => setRet115(e.target.value)} placeholder="0" />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Modelo 117 — Premios lotería/concursos</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="space-y-1">
                    <LabelConAyuda htmlFor="m194-base117" ayuda={GUIA_MODELO_194.baseImponible117}>Base imponible (€)</LabelConAyuda>
                    <Input id="m194-base117" type="number" step="0.01" value={base117} onChange={e => setBase117(e.target.value)} placeholder="0" />
                  </div>
                  <div className="space-y-1">
                    <LabelConAyuda htmlFor="m194-ret117" ayuda={GUIA_MODELO_194.retencion117}>Retención (€)</LabelConAyuda>
                    <Input id="m194-ret117" type="number" step="0.01" value={ret117} onChange={e => setRet117(e.target.value)} placeholder="0" />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Modelo 123 — Capital mobiliario</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="space-y-1">
                    <LabelConAyuda htmlFor="m194-base123" ayuda={GUIA_MODELO_194.baseImponible123}>Base imponible (€)</LabelConAyuda>
                    <Input id="m194-base123" type="number" step="0.01" value={base123} onChange={e => setBase123(e.target.value)} placeholder="0" />
                  </div>
                  <div className="space-y-1">
                    <LabelConAyuda htmlFor="m194-ret123" ayuda={GUIA_MODELO_194.retencion123}>Retención (€)</LabelConAyuda>
                    <Input id="m194-ret123" type="number" step="0.01" value={ret123} onChange={e => setRet123(e.target.value)} placeholder="0" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
