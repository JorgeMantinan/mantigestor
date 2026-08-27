'use client'

import { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { eur, parseEuros } from './types'
import { LabelConAyuda } from './label-con-ayuda'
import { GUIA_MODELO_232 } from '@/lib/fiscal/guia-fiscal'
import { calcularModelo232, METODOS_VINCULACION } from '@mantigestor/utils'
import type { OperacionVinculada } from '@mantigestor/utils'

export function CalculadoraModelo232() {
  const [operaciones, setOperaciones] = useState<OperacionVinculada[]>([])
  const [tipo, setTipo] = useState('')
  const [contraparte, setContraparte] = useState('')
  const [nif, setNif] = useState('')
  const [importe, setImporte] = useState('')
  const [metodo, setMetodo] = useState<string>(METODOS_VINCULACION[0])

  const resultado = useMemo(() => calcularModelo232({ operaciones }), [operaciones])

  const addOperacion = () => {
    const v = parseEuros(importe)
    if (!tipo || !contraparte || v === null) return
    setOperaciones(prev => [...prev, {
      tipo,
      contraparte,
      nif,
      importe: Math.round(v * 100),
      metodo,
    }])
    setTipo('')
    setContraparte('')
    setNif('')
    setImporte('')
  }

  const removeOperacion = (idx: number) =>
    setOperaciones(prev => prev.filter((_, i) => i !== idx))

  return (
    <Card>
      <CardHeader>
        <CardTitle>Modelo 232 — Operaciones vinculadas</CardTitle>
        <CardDescription>Obligatorio si el volumen supera los 250.000€</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <LabelConAyuda htmlFor="tipoOperacion" ayuda={GUIA_MODELO_232.tipoOperacion}>Tipo de operación</LabelConAyuda>
            <Input id="tipoOperacion" value={tipo} onChange={e => setTipo(e.target.value)} placeholder="Ej: Compraventa, Servicios..." />
          </div>
          <div className="space-y-2">
            <LabelConAyuda htmlFor="contraparte" ayuda={GUIA_MODELO_232.contraparte}>Contraparte</LabelConAyuda>
            <Input id="contraparte" value={contraparte} onChange={e => setContraparte(e.target.value)} placeholder="Nombre o razón social" />
          </div>
          <div className="space-y-2">
            <Label>NIF</Label>
            <Input value={nif} onChange={e => setNif(e.target.value)} placeholder="B12345678" />
          </div>
          <div className="space-y-2">
            <Label>Importe (€)</Label>
            <Input type="number" step="0.01" value={importe} onChange={e => setImporte(e.target.value)} placeholder="0.00" />
          </div>
          <div className="space-y-2">
            <LabelConAyuda htmlFor="metodoValoracion" ayuda={GUIA_MODELO_232.metodoValoracion}>Método de valoración</LabelConAyuda>
            <select id="metodoValoracion" value={metodo} onChange={e => setMetodo(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
              {METODOS_VINCULACION.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
        </div>

        <Button variant="outline" onClick={addOperacion} disabled={!tipo || !contraparte || !importe}>
          Añadir operación
        </Button>

        {operaciones.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Operaciones</h4>
            {operaciones.map((op, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg border p-3 text-sm">
                <div>
                  <span className="font-medium">{op.contraparte}</span>
                  <span className="text-muted-foreground ml-2">{op.tipo}</span>
                  {op.nif && <span className="text-muted-foreground ml-2">({op.nif})</span>}
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{eur(op.importe)}</span>
                  <Button variant="ghost" size="sm" onClick={() => removeOperacion(i)}>✕</Button>
                </div>
              </div>
            ))}
          </div>
        )}

        <dl className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border p-3">
            <dt className="text-xs text-muted-foreground">Nº operaciones</dt>
            <dd className="text-lg font-semibold">{resultado.numOperaciones}</dd>
          </div>
          <div className="rounded-lg border p-3">
            <dt className="text-xs text-muted-foreground">Total vinculadas</dt>
            <dd className="text-lg font-semibold">{eur(resultado.totalVinculadas)}</dd>
          </div>
          <div className={`rounded-lg border p-3 sm:col-span-2 ${resultado.obligatorio ? 'border-red-500/50 bg-red-500/5' : 'border-green-500/50 bg-green-500/5'}`}>
            <dt className="text-xs text-muted-foreground">Estado</dt>
            <dd className={`text-sm font-bold ${resultado.obligatorio ? 'text-red-600' : 'text-green-600'}`}>
              {resultado.resumen}
            </dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  )
}
