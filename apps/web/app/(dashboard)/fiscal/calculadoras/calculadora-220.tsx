'use client'

import { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { eur, parseEuros } from './types'
import { LabelConAyuda } from './label-con-ayuda'
import { GUIA_MODELO_220 } from '@/lib/fiscal/guia-fiscal'
import { calcularModelo220 } from '@mantigestor/utils'
import type { EntidadGrupo } from '@mantigestor/utils'
import { BotonPDF } from '@/components/boton-pdf'

export function CalculadoraModelo220() {
  const [entidades, setEntidades] = useState<EntidadGrupo[]>([])
  const [nombre, setNombre] = useState('')
  const [nif, setNif] = useState('')
  const [base, setBase] = useState('')
  const [cuota, setCuota] = useState('')
  const [pagosAnt, setPagosAnt] = useState('')

  const resultado = useMemo(() => {
    return calcularModelo220({
      entidades,
      cuotaConsolidada: entidades.reduce((s, e) => s + e.cuotaIntegra, 0),
      pagosAnteriores: Math.round((parseEuros(pagosAnt) ?? 0) * 100),
    })
  }, [entidades, pagosAnt])

  const addEntidad = () => {
    const b = parseEuros(base)
    const c = parseEuros(cuota)
    if (!nombre || b === null || c === null) return
    setEntidades(prev => [...prev, {
      nombre,
      nif,
      baseImponible: Math.round(b * 100),
      cuotaIntegra: Math.round(c * 100),
    }])
    setNombre('')
    setNif('')
    setBase('')
    setCuota('')
  }

  const removeEntidad = (idx: number) =>
    setEntidades(prev => prev.filter((_, i) => i !== idx))

  return (
    <div id="pdf-modelo-220" className="space-y-3">
      <BotonPDF elementId="pdf-modelo-220" filename="modelo-220" />
      <Card>
      <CardHeader>
        <CardTitle>Modelo 220 — IS consolidación fiscal</CardTitle>
        <CardDescription>Declaración del impuesto de sociedades para grupos</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Nombre de la entidad</Label>
            <Input value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Razón social" />
          </div>
          <div className="space-y-2">
            <Label>NIF</Label>
            <Input value={nif} onChange={e => setNif(e.target.value)} placeholder="B12345678" />
          </div>
          <div className="space-y-2">
            <LabelConAyuda htmlFor="baseImponible" ayuda={GUIA_MODELO_220.baseImponible}>Base imponible (€)</LabelConAyuda>
            <Input id="baseImponible" type="number" step="0.01" value={base} onChange={e => setBase(e.target.value)} placeholder="0.00" />
          </div>
          <div className="space-y-2">
            <LabelConAyuda htmlFor="cuotaIntegra" ayuda={GUIA_MODELO_220.cuotaIntegra}>Cuota íntegra (€)</LabelConAyuda>
            <Input id="cuotaIntegra" type="number" step="0.01" value={cuota} onChange={e => setCuota(e.target.value)} placeholder="0.00" />
          </div>
        </div>

        <Button variant="outline" onClick={addEntidad} disabled={!nombre || !base || !cuota}>
          Añadir entidad
        </Button>

        {entidades.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Entidades del grupo</h4>
            {entidades.map((ent, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg border p-3 text-sm">
                <div>
                  <span className="font-medium">{ent.nombre}</span>
                  {ent.nif && <span className="text-muted-foreground ml-2">({ent.nif})</span>}
                </div>
                <div className="flex items-center gap-3">
                  <span>Base: {eur(ent.baseImponible)}</span>
                  <span className="font-medium">Cuota: {eur(ent.cuotaIntegra)}</span>
                  <Button variant="ghost" size="sm" onClick={() => removeEntidad(i)}>✕</Button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="max-w-xs space-y-2">
          <Label>Pagos anteriores (€)</Label>
          <Input type="number" step="0.01" value={pagosAnt} onChange={e => setPagosAnt(e.target.value)} placeholder="0.00" />
        </div>

        {entidades.length > 0 && (
          <dl className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border p-3">
              <dt className="text-xs text-muted-foreground">Base imponible total</dt>
              <dd className="text-lg font-semibold">{eur(resultado.totalBaseImponible)}</dd>
            </div>
            <div className="rounded-lg border p-3">
              <dt className="text-xs text-muted-foreground">Cuota consolidada</dt>
              <dd className="text-lg font-semibold">{eur(resultado.cuotaConsolidada)}</dd>
            </div>
            {resultado.aPagar > 0 && (
              <div className="rounded-lg border border-red-500/50 bg-red-500/5 p-3">
                <dt className="text-xs text-muted-foreground">Total a pagar</dt>
                <dd className="text-lg font-bold text-red-600">{eur(resultado.aPagar)}</dd>
              </div>
            )}
            {resultado.aDevolver > 0 && (
              <div className="rounded-lg border border-green-500/50 bg-green-500/5 p-3">
                <dt className="text-xs text-muted-foreground">Total a devolver</dt>
                <dd className="text-lg font-bold text-green-600">{eur(resultado.aDevolver)}</dd>
              </div>
            )}
          </dl>
        )}
      </CardContent>
    </Card>
    </div>
  )
}
