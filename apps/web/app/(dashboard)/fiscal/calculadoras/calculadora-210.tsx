'use client'

import { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { eur, parseEuros } from './types'
import { LabelConAyuda } from './label-con-ayuda'
import { GUIA_MODELO_210 } from '@/lib/fiscal/guia-fiscal'
import { calcularModelo210, TIPOS_RENTA_210 } from '@mantigestor/utils'
import type { TipoRenta210 } from '@mantigestor/utils'
import { BotonPDF } from '@/components/boton-pdf'

export function CalculadoraModelo210() {
  const [tipoRenta, setTipoRenta] = useState<TipoRenta210>('inmobiliaria')
  const [base, setBase] = useState('')
  const [retencion, setRetencion] = useState('')
  const [gastos, setGastos] = useState('')
  const [esUe, setEsUe] = useState(false)

  const resultado = useMemo(() => {
    const b = parseEuros(base)
    if (b === null) return null
    return calcularModelo210({
      tipoRenta,
      baseImponible: Math.round(b * 100),
      retencion: Math.round((parseEuros(retencion) ?? 0) * 100),
      gastosDeducibles: Math.round((parseEuros(gastos) ?? 0) * 100),
      esResidenteUe: esUe,
    })
  }, [tipoRenta, base, retencion, gastos, esUe])

  return (
    <div id="pdf-modelo-210" className="space-y-3">
      <BotonPDF elementId="pdf-modelo-210" filename="modelo-210" />
      <Card>
      <CardHeader>
        <CardTitle>Modelo 210 — IRNR</CardTitle>
        <CardDescription>Impuesto sobre la Renta de No Residentes</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="max-w-sm space-y-2">
          <Label>Tipo de renta</Label>
          <select value={tipoRenta} onChange={e => setTipoRenta(e.target.value as TipoRenta210)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
            {TIPOS_RENTA_210.map(t => <option key={t.valor} value={t.valor}>{t.label}</option>)}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <input type="checkbox" id="es-ue" checked={esUe} onChange={e => setEsUe(e.target.checked)} className="rounded border-input" />
          <Label htmlFor="es-ue" className="cursor-pointer">Residente UE/EEE</Label>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <LabelConAyuda htmlFor="baseImponible" ayuda={GUIA_MODELO_210.baseImponible}>Base imponible (€)</LabelConAyuda>
            <Input id="baseImponible" type="number" step="0.01" value={base} onChange={e => setBase(e.target.value)} placeholder="0.00" />
          </div>
          <div className="space-y-2">
            <LabelConAyuda htmlFor="retencionPracticada" ayuda={GUIA_MODELO_210.retencionPracticada}>Retención practicada (€)</LabelConAyuda>
            <Input id="retencionPracticada" type="number" step="0.01" value={retencion} onChange={e => setRetencion(e.target.value)} placeholder="0.00" />
          </div>
          <div className="space-y-2">
            <Label>Gastos deducibles (€)</Label>
            <Input type="number" step="0.01" value={gastos} onChange={e => setGastos(e.target.value)} placeholder="0.00" />
          </div>
        </div>

        {resultado && (
          <dl className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border p-3">
              <dt className="text-xs text-muted-foreground">Base imponible neta</dt>
              <dd className="text-lg font-semibold">{eur(resultado.baseImponible)}</dd>
            </div>
            <div className="rounded-lg border p-3">
              <dt className="text-xs text-muted-foreground">Tipo de retención</dt>
              <dd className="text-lg font-semibold">{resultado.tipoRetencion}%</dd>
            </div>
            <div className="rounded-lg border p-3">
              <dt className="text-xs text-muted-foreground">Cuota íntegra</dt>
              <dd className="text-lg font-semibold">{eur(resultado.cuotaIntegra)}</dd>
            </div>
            <div className={`rounded-lg border p-3 ${resultado.resultado >= 0 ? 'border-red-500/50 bg-red-500/5' : 'border-green-500/50 bg-green-500/5'}`}>
              <dt className="text-xs text-muted-foreground">Resultado</dt>
              <dd className={`text-lg font-bold ${resultado.resultado >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                {eur(Math.abs(resultado.resultado))} {resultado.resultado >= 0 ? 'a ingresar' : 'a devolver'}
              </dd>
            </div>
          </dl>
        )}
      </CardContent>
    </Card>
    </div>
  )
}
