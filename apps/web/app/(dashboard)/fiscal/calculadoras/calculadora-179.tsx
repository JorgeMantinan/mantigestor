'use client'

import { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Home } from 'lucide-react'
import { calcularModelo179 } from '@mantigestor/utils'
import { LabelConAyuda } from './label-con-ayuda'
import { GUIA_MODELO_179 } from '@/lib/fiscal/guia-fiscal'
import { BotonPDF } from '@/components/boton-pdf'

const formatoEuros = (euros: number) =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(euros)

export function CalculadoraModelo179() {
  const [diasAlquiler, setDiasAlquiler] = useState('')
  const [rendimiento, setRendimiento] = useState('')
  const [viviendas, setViviendas] = useState('')

  const resultado = useMemo(
    () =>
      calcularModelo179({
        diasAlquiler: parseFloat(diasAlquiler) || 0,
        rendimiento: parseFloat(rendimiento) || 0,
        viviendas: parseFloat(viviendas) || 0,
      }),
    [diasAlquiler, rendimiento, viviendas]
  )

  const hasData = parseFloat(viviendas) > 0

  return (
    <div id="pdf-modelo-179" className="space-y-3">
      <BotonPDF elementId="pdf-modelo-179" filename="modelo-179" />
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Home className="h-5 w-5 text-primary" aria-hidden="true" />
            <div>
              <CardTitle>Modelo 179 — Viviendas turísticas</CardTitle>
              <CardDescription>
                Declaración informativa trimestral de viviendas de uso turístico y alquiler de corta duración.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <LabelConAyuda htmlFor="m179-dias" ayuda={GUIA_MODELO_179.diasAlquiler}>Días de alquiler por vivienda</LabelConAyuda>
              <Input id="m179-dias" type="number" min="0" step="1" placeholder="120" value={diasAlquiler} onChange={e => setDiasAlquiler(e.target.value)} />
            </div>
            <div className="space-y-2">
              <LabelConAyuda htmlFor="m179-rendimiento" ayuda={GUIA_MODELO_179.rendimiento}>Rendimiento trimestral (€)</LabelConAyuda>
              <Input id="m179-rendimiento" type="number" min="0" step="0.01" placeholder="12000" value={rendimiento} onChange={e => setRendimiento(e.target.value)} />
            </div>
            <div className="space-y-2">
              <LabelConAyuda htmlFor="m179-viviendas" ayuda={GUIA_MODELO_179.viviendas}>Número de viviendas</LabelConAyuda>
              <Input id="m179-viviendas" type="number" min="0" step="1" placeholder="2" value={viviendas} onChange={e => setViviendas(e.target.value)} />
            </div>
          </div>

          {hasData && (
            <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-lg border p-3">
                <dt className="text-xs text-muted-foreground">Viviendas</dt>
                <dd className="text-lg font-semibold">{resultado.viviendas}</dd>
              </div>
              <div className="rounded-lg border p-3">
                <dt className="text-xs text-muted-foreground">Días totales alquilados</dt>
                <dd className="text-lg font-semibold">{resultado.diasTotales}</dd>
              </div>
              <div className="rounded-lg border p-3">
                <dt className="text-xs text-muted-foreground">Promedio días por vivienda</dt>
                <dd className="text-lg font-semibold">{resultado.promedioDias.toFixed(1)}</dd>
              </div>
              <div className="rounded-lg border border-primary/50 bg-primary/5 p-3">
                <dt className="text-xs text-muted-foreground">Rendimiento total</dt>
                <dd className="text-lg font-bold text-primary">{formatoEuros(resultado.rendimientoTotal)}</dd>
              </div>
            </dl>
          )}

          {!hasData && (
            <p className="text-sm text-muted-foreground">
              Introduce los días de alquiler y el rendimiento para ver el resumen del periodo.
            </p>
          )}

          <p className="text-xs text-muted-foreground">
            Cálculo orientativo. El modelo 179 es una declaración informativa: no se paga cuota, se informa de
            la cesión de viviendas turísticas y sus arrendamientos de corta duración. Presentación trimestral.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}