'use client'

import { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { eur, parseEuros } from './types'
import { calcularModelo714, COMUNIDADES_AUTONOMAS } from '@mantigestor/utils'
import type { BienPatrimonio } from '@mantigestor/utils'
import { LabelConAyuda } from './label-con-ayuda'
import { GUIA_MODELO_714 } from '@/lib/fiscal/guia-fiscal'
import { BotonPDF } from '@/components/boton-pdf'

export function CalculadoraModelo714() {
  const [bienes, setBienes] = useState<BienPatrimonio[]>([])
  const [comunidad, setComunidad] = useState('')
  const [tipo, setTipo] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [valor, setValor] = useState('')
  const [deudas, setDeudas] = useState('')

  const resultado = useMemo(() => calcularModelo714({ bienes, comunidadAutonoma: comunidad }), [bienes, comunidad])

  const addBien = () => {
    const v = parseEuros(valor)
    if (!tipo || v === null) return

    setBienes(prev => [...prev, {
      tipo,
      descripcion,
      valor: v,
      deudas: parseEuros(deudas) ?? 0,
    }])
    setTipo('')
    setDescripcion('')
    setValor('')
    setDeudas('')
  }

  const removeBien = (idx: number) => {
    setBienes(prev => prev.filter((_, i) => i !== idx))
  }

  return (
    <div id="pdf-modelo-714" className="space-y-3">
      <BotonPDF elementId="pdf-modelo-714" filename="modelo-714" />
      <Card>
      <CardHeader>
        <CardTitle>Modelo 714 — Impuesto sobre el Patrimonio</CardTitle>
        <CardDescription>
          Declaración anual obligatoria si el patrimonio neto supera los 700.000€
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="max-w-xs space-y-2">
          <Label>Comunidad autónoma</Label>
          <select value={comunidad} onChange={e => setComunidad(e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
            <option value="">Seleccionar...</option>
            {COMUNIDADES_AUTONOMAS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Tipo de bien</Label>
            <Input value={tipo} onChange={e => setTipo(e.target.value)} placeholder="Inmueble, cuenta, vehículo..." />
          </div>
          <div className="space-y-2">
            <Label>Descripción</Label>
            <Input value={descripcion} onChange={e => setDescripcion(e.target.value)} placeholder="Piso en Madrid, cuenta..." />
          </div>
          <div className="space-y-2">
            <LabelConAyuda htmlFor="m714-valor" ayuda={GUIA_MODELO_714.patrimonioNeto}>Valor (€)</LabelConAyuda>
            <Input id="m714-valor" type="number" step="0.01" value={valor} onChange={e => setValor(e.target.value)} placeholder="0.00" />
          </div>
          <div className="space-y-2">
            <Label>Deudas/cargas (€)</Label>
            <Input type="number" step="0.01" value={deudas} onChange={e => setDeudas(e.target.value)} placeholder="0.00" />
          </div>
        </div>

        <Button variant="outline" onClick={addBien} disabled={!tipo || !valor}>
          Añadir bien
        </Button>

        {bienes.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Bienes declarados</h4>
            <div className="space-y-2">
              {bienes.map((b, i) => (
                <div key={i} className="flex items-center justify-between rounded-lg border p-3 text-sm">
                  <div>
                    <span className="font-medium">{b.tipo}</span>
                    {b.descripcion && <span className="text-muted-foreground ml-2">— {b.descripcion}</span>}
                    {b.deudas > 0 && <span className="text-muted-foreground ml-2">· Deudas: {eur(b.deudas)}</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{eur(b.valor)}</span>
                    <Button variant="ghost" size="sm" onClick={() => removeBien(i)}>✕</Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <dl className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border p-3">
            <dt className="text-xs text-muted-foreground">Valor total bienes</dt>
            <dd className="text-lg font-semibold">{eur(resultado.valorTotal)}</dd>
          </div>
          <div className="rounded-lg border p-3">
            <dt className="text-xs text-muted-foreground">Deudas totales</dt>
            <dd className="text-lg font-semibold">{eur(resultado.deudas)}</dd>
          </div>
          <div className={`rounded-lg border p-3 sm:col-span-2 ${resultado.obligatorio ? 'border-red-500/50 bg-red-500/5' : 'border-green-500/50 bg-green-500/5'}`}>
            <dt className="text-xs text-muted-foreground">Base imponible</dt>
            <dd className={`text-lg font-bold ${resultado.obligatorio ? 'text-red-600' : 'text-green-600'}`}>
              {eur(resultado.baseImponible)}
            </dd>
          </div>
          <div className="rounded-lg border p-3">
            <dt className="text-xs text-muted-foreground">Bonificación autonómica</dt>
            <dd className="text-sm font-medium">{resultado.bonificacionAplicable}</dd>
          </div>
          {resultado.porcentajeBonificacion > 0 && (
            <div className="rounded-lg border border-green-500/50 bg-green-500/5 p-3">
              <dt className="text-xs text-muted-foreground">Bonificación en cuota</dt>
              <dd className="text-sm font-bold text-green-600">
                {Math.round(resultado.porcentajeBonificacion * 100)}% de la cuota íntegra
              </dd>
            </div>
          )}
          <div className="rounded-lg border p-3 sm:col-span-2">
            <dt className="text-xs text-muted-foreground">
              Deducciones y bonificaciones aplicables (estatales + autonómicas)
            </dt>
            <dd className="space-y-2 pt-1">
              {resultado.deducciones.map(d => (
                <div key={d.titulo} className="rounded bg-muted/40 p-2 text-sm">
                  <p className="font-medium">
                    <span
                      className={`mr-2 inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${
                        d.ambito === 'estatal' ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {d.ambito === 'estatal' ? 'Estatal' : 'Autonómica'}
                    </span>
                    {d.titulo}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    <strong>Cuantía:</strong> {d.cuantia}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    <strong>Requisitos:</strong> {d.requisitos}
                  </p>
                </div>
              ))}
            </dd>
          </div>
          <div className={`rounded-lg border p-3 sm:col-span-2 ${resultado.obligatorio ? 'border-red-500/50 bg-red-500/5' : 'border-green-500/50 bg-green-500/5'}`}>
            <dt className="text-xs text-muted-foreground">Resultado</dt>
            <dd className={`font-bold ${resultado.obligatorio ? 'text-red-600' : 'text-green-600'}`}>
              {resultado.resumen}
            </dd>
          </div>
        </dl>
      </CardContent>
    </Card>
    </div>
  )
}
