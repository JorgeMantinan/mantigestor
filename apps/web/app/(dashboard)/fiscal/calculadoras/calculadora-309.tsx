'use client'

import { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { eur, parseEuros } from './types'
import { calcularModelo309 } from '@mantigestor/utils'
import { LabelConAyuda } from './label-con-ayuda'
import { GUIA_MODELO_309 } from '@/lib/fiscal/guia-fiscal'
import { BotonPDF } from '@/components/boton-pdf'

export function CalculadoraModelo309({ datosIniciales }: { datosIniciales?: { base21?: number; base10?: number; base4?: number; deducciones?: number } } = {}) {
  const [base21, setBase21] = useState(datosIniciales?.base21 != null ? String(datosIniciales.base21) : '')
  const [base10, setBase10] = useState(datosIniciales?.base10 != null ? String(datosIniciales.base10) : '')
  const [base4, setBase4] = useState(datosIniciales?.base4 != null ? String(datosIniciales.base4) : '')
  const [cuota21, setCuota21] = useState('')
  const [cuota10, setCuota10] = useState('')
  const [cuota4, setCuota4] = useState('')
  const [deducciones, setDeducciones] = useState(datosIniciales?.deducciones != null ? String(datosIniciales.deducciones) : '')

  const resultado = useMemo(() => {
    return calcularModelo309({
      baseImponible21: Math.round((parseEuros(base21) ?? 0) * 100),
      baseImponible10: Math.round((parseEuros(base10) ?? 0) * 100),
      baseImponible4: Math.round((parseEuros(base4) ?? 0) * 100),
      cuotaDevengada21: Math.round((parseEuros(cuota21) ?? 0) * 100),
      cuotaDevengada10: Math.round((parseEuros(cuota10) ?? 0) * 100),
      cuotaDevengada4: Math.round((parseEuros(cuota4) ?? 0) * 100),
      deducciones: Math.round((parseEuros(deducciones) ?? 0) * 100),
    })
  }, [base21, base10, base4, cuota21, cuota10, cuota4, deducciones])

  return (
    <div id="pdf-modelo-309" className="space-y-3">
      <BotonPDF elementId="pdf-modelo-309" filename="modelo-309" />
      <Card>
      <CardHeader>
        <CardTitle>Modelo 309 — IVA simplificado</CardTitle>
        <CardDescription>Declaración-liquidación periódica del IVA simplificado</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <h4 className="font-medium text-sm">Cuota devengada por tipo</h4>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <LabelConAyuda htmlFor="m309-base-21" ayuda={GUIA_MODELO_309.ingresos}>Base 21% (€)</LabelConAyuda>
              <Input id="m309-base-21" type="number" step="0.01" value={base21} onChange={e => setBase21(e.target.value)} placeholder="0.00" />
            </div>
            <div className="space-y-2">
              <Label>Base 10% (€)</Label>
              <Input type="number" step="0.01" value={base10} onChange={e => setBase10(e.target.value)} placeholder="0.00" />
            </div>
            <div className="space-y-2">
              <Label>Base 4% (€)</Label>
              <Input type="number" step="0.01" value={base4} onChange={e => setBase4(e.target.value)} placeholder="0.00" />
            </div>
            <div className="space-y-2">
              <Label>Cuota 21% (€)</Label>
              <Input type="number" step="0.01" value={cuota21} onChange={e => setCuota21(e.target.value)} placeholder="0.00" />
            </div>
            <div className="space-y-2">
              <Label>Cuota 10% (€)</Label>
              <Input type="number" step="0.01" value={cuota10} onChange={e => setCuota10(e.target.value)} placeholder="0.00" />
            </div>
            <div className="space-y-2">
              <Label>Cuota 4% (€)</Label>
              <Input type="number" step="0.01" value={cuota4} onChange={e => setCuota4(e.target.value)} placeholder="0.00" />
            </div>
          </div>
        </div>

        <div className="max-w-xs space-y-2">
          <Label>Deducciones (€)</Label>
          <Input type="number" step="0.01" value={deducciones} onChange={e => setDeducciones(e.target.value)} placeholder="0.00" />
        </div>

        <dl className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border p-3">
            <dt className="text-xs text-muted-foreground">Cuota devengada</dt>
            <dd className="text-lg font-semibold">{eur(resultado.cuotaDevengada)}</dd>
          </div>
          <div className="rounded-lg border p-3">
            <dt className="text-xs text-muted-foreground">Deducciones</dt>
            <dd className="text-lg font-semibold">{eur(resultado.deducciones)}</dd>
          </div>
          <div className={`rounded-lg border p-3 ${resultado.cuotaLiquida >= 0 ? 'border-red-500/50 bg-red-500/5' : 'border-green-500/50 bg-green-500/5'}`}>
            <dt className="text-xs text-muted-foreground">Cuota líquida</dt>
            <dd className={`text-lg font-bold ${resultado.cuotaLiquida >= 0 ? 'text-red-600' : 'text-green-600'}`}>
              {eur(Math.abs(resultado.cuotaLiquida))} {resultado.aIngresar > 0 ? 'a ingresar' : 'a devolver'}
            </dd>
          </div>
        </dl>
      </CardContent>
    </Card>
    </div>
  )
}
