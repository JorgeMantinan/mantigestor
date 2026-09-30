'use client'

import { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { eur, parseEuros } from './types'
import { calcularModelo193 } from '@mantigestor/utils'
import type { RetencionSeguro } from '@mantigestor/utils'
import { BotonPDF } from '@/components/boton-pdf'

export function CalculadoraModelo193({ taxYear }: { taxYear: number }) {
  const [retenciones, setRetenciones] = useState<RetencionSeguro[]>([])
  const [aseguradoNif, setAseguradoNif] = useState('')
  const [aseguradoNombre, setAseguradoNombre] = useState('')
  const [tipoRendimiento, setTipoRendimiento] = useState<RetencionSeguro['tipoRendimiento']>('intereses')
  const [baseRetencion, setBaseRetencion] = useState('')
  const [tipoRetencion, setTipoRetencion] = useState('19')

  const resultado = useMemo(() => calcularModelo193({ ejercicio: taxYear, retenciones }), [taxYear, retenciones])

  const addRetencion = () => {
    const base = parseEuros(baseRetencion) ?? 0
    const tipo = parseFloat(tipoRetencion) || 19
    if (!aseguradoNif || !aseguradoNombre || base === 0) return

    const retencionPracticada = Math.round(base * tipo / 100)

    setRetenciones(prev => [...prev, {
      aseguradoNif,
      aseguradoNombre,
      tipoRendimiento,
      baseRetencion: base,
      tipoRetencion: tipo,
      retencionPracticada,
    }])
    setAseguradoNif('')
    setAseguradoNombre('')
    setBaseRetencion('')
  }

  const removeRetencion = (idx: number) => {
    setRetenciones(prev => prev.filter((_, i) => i !== idx))
  }

  return (
    <div id="pdf-modelo-193" className="space-y-3">
      <BotonPDF elementId="pdf-modelo-193" filename="modelo-193" />
      <Card>
      <CardHeader>
        <CardTitle>Modelo 193 - Resumen anual capital mobiliario</CardTitle>
        <CardDescription>
          Retenciones e ingresos a cuenta sobre rendimientos del capital mobiliario derivados de operaciones de seguros
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>NIF del asegurado</Label>
            <Input value={aseguradoNif} onChange={e => setAseguradoNif(e.target.value)} placeholder="12345678A" />
          </div>
          <div className="space-y-2">
            <Label>Nombre del asegurado</Label>
            <Input value={aseguradoNombre} onChange={e => setAseguradoNombre(e.target.value)} placeholder="Juan Pérez" />
          </div>
          <div className="space-y-2">
            <Label>Tipo de rendimiento</Label>
            <select
              value={tipoRendimiento}
              onChange={e => setTipoRendimiento(e.target.value as RetencionSeguro['tipoRendimiento'])}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
            >
              <option value="intereses">Intereses</option>
              <option value="dividendos">Dividendos</option>
              <option value="otro">Otro</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label>Base de retención (€)</Label>
            <Input type="number" step="0.01" value={baseRetencion} onChange={e => setBaseRetencion(e.target.value)} placeholder="0.00" />
          </div>
          <div className="space-y-2">
            <Label>Tipo de retención (%)</Label>
            <Input type="number" step="0.01" value={tipoRetencion} onChange={e => setTipoRetencion(e.target.value)} placeholder="19" />
          </div>
        </div>

        <Button variant="outline" onClick={addRetencion} disabled={!aseguradoNif || !aseguradoNombre}>
          Añadir retención
        </Button>

        {retenciones.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Retenciones ({retenciones.length})</h4>
            <div className="space-y-2">
              {retenciones.map((r, i) => (
                <div key={i} className="flex items-center justify-between rounded-lg border p-3 text-sm">
                  <div>
                    <span className="font-medium">{r.aseguradoNombre}</span>
                    <span className="text-muted-foreground ml-2">{r.aseguradoNif}</span>
                    <span className="text-muted-foreground ml-2">
                      — Base: {eur(r.baseRetencion)} @ {r.tipoRetencion}%
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{eur(r.retencionPracticada)}</span>
                    <Button variant="ghost" size="sm" onClick={() => removeRetencion(i)}>✕</Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <dl className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border p-3">
            <dt className="text-xs text-muted-foreground">Asegurados</dt>
            <dd className="text-lg font-semibold">{resultado.numAsegurados}</dd>
          </div>
          <div className="rounded-lg border p-3">
            <dt className="text-xs text-muted-foreground">Base total retención</dt>
            <dd className="text-lg font-semibold">{eur(resultado.totalBaseRetencion)}</dd>
          </div>
          <div className="rounded-lg border p-3 sm:col-span-2">
            <dt className="text-xs text-muted-foreground">Total retenciones practicadas</dt>
            <dd className="text-lg font-semibold">{eur(resultado.totalRetenciones)}</dd>
          </div>
          <div className="rounded-lg border p-3 sm:col-span-2">
            <dt className="text-xs text-muted-foreground">Resumen</dt>
            <dd className="font-bold">{resultado.resumen}</dd>
          </div>
        </dl>
      </CardContent>
    </Card>
    </div>
  )
}
