'use client'

import { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Link2, Plus, X } from 'lucide-react'
import { calcularModelo233 } from '@mantigestor/utils'
import type { OperacionVinculada233 } from '@mantigestor/utils'
import { LabelConAyuda } from './label-con-ayuda'
import { GUIA_MODELO_233 } from '@/lib/fiscal/guia-fiscal'
import { BotonPDF } from '@/components/boton-pdf'
import { parseEuros } from './types'

const formatoEuros = (euros: number) =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(euros)

export function CalculadoraModelo233() {
  const [operaciones, setOperaciones] = useState<OperacionVinculada233[]>([])
  const [nif, setNif] = useState('')
  const [importe, setImporte] = useState('')

  const resultado = useMemo(() => calcularModelo233({ operaciones }), [operaciones])

  const addOperacion = () => {
    const v = parseEuros(importe)
    if (!nif.trim() || v === null) return
    setOperaciones(prev => [...prev, { nifContraparte: nif.trim().toUpperCase(), importe: v }])
    setNif('')
    setImporte('')
  }

  const removeOperacion = (idx: number) =>
    setOperaciones(prev => prev.filter((_, i) => i !== idx))

  return (
    <div id="pdf-modelo-233" className="space-y-3">
      <BotonPDF elementId="pdf-modelo-233" filename="modelo-233" />
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Link2 className="h-5 w-5 text-primary" aria-hidden="true" />
            <div>
              <CardTitle>Modelo 233 — Operaciones vinculadas</CardTitle>
              <CardDescription>
                Declaración informativa anual de operaciones con personas o entidades vinculadas.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] items-end">
            <div className="space-y-2">
              <LabelConAyuda htmlFor="m233-nif" ayuda={GUIA_MODELO_233.nifContraparte}>NIF de la contraparte</LabelConAyuda>
              <Input id="m233-nif" value={nif} onChange={e => setNif(e.target.value)} placeholder="B12345678" />
            </div>
            <div className="space-y-2">
              <LabelConAyuda htmlFor="m233-importe" ayuda={GUIA_MODELO_233.importe}>Importe de la operación (€)</LabelConAyuda>
              <Input id="m233-importe" type="number" min="0" step="0.01" value={importe} onChange={e => setImporte(e.target.value)} placeholder="0.00" />
            </div>
            <Button variant="outline" onClick={addOperacion} disabled={!nif.trim() || !importe}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              Añadir
            </Button>
          </div>

          {operaciones.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Operaciones</h4>
              {operaciones.map((op, i) => (
                <div key={`${op.nifContraparte}-${i}`} className="flex items-center justify-between rounded-lg border p-3 text-sm">
                  <span className="font-medium">{op.nifContraparte}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{formatoEuros(op.importe)}</span>
                    <Button variant="ghost" size="sm" onClick={() => removeOperacion(i)} className="h-7 text-destructive">
                      <X className="h-3 w-3" aria-hidden="true" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <dl className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border p-3">
              <dt className="text-xs text-muted-foreground">Nº operaciones</dt>
              <dd className="text-lg font-semibold">{resultado.operaciones.length}</dd>
            </div>
            <div className="rounded-lg border p-3">
              <dt className="text-xs text-muted-foreground">Total operaciones</dt>
              <dd className="text-lg font-semibold">{formatoEuros(resultado.totalOperaciones)}</dd>
            </div>
            <div className="rounded-lg border p-3">
              <dt className="text-xs text-muted-foreground">Umbral de declaración</dt>
              <dd className="text-lg font-semibold">{formatoEuros(resultado.umbral)}</dd>
            </div>
            <div className={`rounded-lg border p-3 ${resultado.superaUmbral ? 'border-red-500/50 bg-red-500/5' : 'border-green-500/50 bg-green-500/5'}`}>
              <dt className="text-xs text-muted-foreground">Estado</dt>
              <dd className={`text-sm font-bold ${resultado.superaUmbral ? 'text-red-600' : 'text-green-600'}`}>
                {resultado.superaUmbral
                  ? 'OBLIGATORIO: se supera el umbral de 250.000€'
                  : 'No obligatorio por importe'}
              </dd>
            </div>
          </dl>

          <p className="text-xs text-muted-foreground">
            Cálculo orientativo. El modelo 233 es informativo: no genera cuota a ingresar, solo informa de
            operaciones vinculadas superiores a 250.000€ en el ejercicio. Presentación anual.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}