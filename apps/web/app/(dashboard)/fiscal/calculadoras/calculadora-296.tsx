'use client'

import { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { eur, parseEuros } from './types'
import { LabelConAyuda } from './label-con-ayuda'
import { GUIA_MODELO_296 } from '@/lib/fiscal/guia-fiscal'
import { calcularModelo296, TIPOS_RENTA_296 } from '@mantigestor/utils'
import type { RetencionNoResidente } from '@mantigestor/utils'
import { BotonPDF } from '@/components/boton-pdf'

export function CalculadoraModelo296() {
  const [retenciones, setRetenciones] = useState<RetencionNoResidente[]>([])
  const [nif, setNif] = useState('')
  const [nombre, setNombre] = useState('')
  const [base, setBase] = useState('')
  const [retencion, setRetencion] = useState('')
  const [tipo, setTipo] = useState<string>(TIPOS_RENTA_296[0])

  const resultado = useMemo(() => calcularModelo296({ retenciones }), [retenciones])

  const addRetencion = () => {
    const b = parseEuros(base)
    const r = parseEuros(retencion)
    if (!nif || b === null || r === null) return
    setRetenciones(prev => [...prev, {
      nif,
      nombre,
      baseImponible: Math.round(b * 100),
      retencion: Math.round(r * 100),
      tipo,
    }])
    setNif('')
    setNombre('')
    setBase('')
    setRetencion('')
  }

  const removeRetencion = (idx: number) =>
    setRetenciones(prev => prev.filter((_, i) => i !== idx))

  return (
    <div id="pdf-modelo-296" className="space-y-3">
      <BotonPDF elementId="pdf-modelo-296" filename="modelo-296" />
      <Card>
      <CardHeader>
        <CardTitle>Modelo 296 — Retenciones no residentes</CardTitle>
        <CardDescription>Declaración-resumen anual de retenciones IRPF sobre no residentes</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>NIF</Label>
            <Input value={nif} onChange={e => setNif(e.target.value)} placeholder="X12345678" />
          </div>
          <div className="space-y-2">
            <Label>Nombre</Label>
            <Input value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Nombre del sujeto" />
          </div>
          <div className="space-y-2">
            <LabelConAyuda htmlFor="baseImponible" ayuda={GUIA_MODELO_296.baseImponible}>Base imponible (€)</LabelConAyuda>
            <Input id="baseImponible" type="number" step="0.01" value={base} onChange={e => setBase(e.target.value)} placeholder="0.00" />
          </div>
          <div className="space-y-2">
            <LabelConAyuda htmlFor="retencion" ayuda={GUIA_MODELO_296.retencion}>Retención (€)</LabelConAyuda>
            <Input id="retencion" type="number" step="0.01" value={retencion} onChange={e => setRetencion(e.target.value)} placeholder="0.00" />
          </div>
          <div className="space-y-2">
            <Label>Tipo de renta</Label>
            <select value={tipo} onChange={e => setTipo(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
              {TIPOS_RENTA_296.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>

        <Button variant="outline" onClick={addRetencion} disabled={!nif || !base || !retencion}>
          Añadir retención
        </Button>

        {retenciones.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Retenciones declaradas</h4>
            {retenciones.map((ret, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg border p-3 text-sm">
                <div>
                  <span className="font-medium">{ret.nif}</span>
                  {ret.nombre && <span className="text-muted-foreground ml-2">{ret.nombre}</span>}
                  <span className="text-muted-foreground ml-2">({ret.tipo})</span>
                </div>
                <div className="flex items-center gap-3">
                  <span>Base: {eur(ret.baseImponible)}</span>
                  <span className="font-medium">Ret.: {eur(ret.retencion)}</span>
                  <Button variant="ghost" size="sm" onClick={() => removeRetencion(i)}>✕</Button>
                </div>
              </div>
            ))}
          </div>
        )}

        <dl className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border p-3">
            <dt className="text-xs text-muted-foreground">Nº de sujetos</dt>
            <dd className="text-lg font-semibold">{resultado.numSujetos}</dd>
          </div>
          <div className="rounded-lg border p-3">
            <dt className="text-xs text-muted-foreground">Base imponible total</dt>
            <dd className="text-lg font-semibold">{eur(resultado.totalBaseImponible)}</dd>
          </div>
          <div className="rounded-lg border border-primary/50 bg-primary/5 p-3">
            <dt className="text-xs text-muted-foreground">Total retenciones</dt>
            <dd className="text-lg font-bold text-primary">{eur(resultado.totalRetenciones)}</dd>
          </div>
          <div className="rounded-lg border p-3">
            <dt className="text-xs text-muted-foreground">Retención media</dt>
            <dd className="text-lg font-semibold">{eur(resultado.retencionMedia)}</dd>
          </div>
        </dl>
      </CardContent>
    </Card>
    </div>
  )
}
