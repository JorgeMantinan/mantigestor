'use client'

import { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Building2 } from 'lucide-react'
import { calcularModelo170, TIPOS_RETENCION_MODELO_170 } from '@mantigestor/utils'
import { LabelConAyuda } from './label-con-ayuda'
import { GUIA_MODELO_170 } from '@/lib/fiscal/guia-fiscal'
import { BotonPDF } from '@/components/boton-pdf'

const formatoEuros = (euros: number) =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(euros)

const OPCIONES_TIPO_RETENCION = [
  { valor: TIPOS_RETENCION_MODELO_170.restoConceptos, etiqueta: '19% — Resto de conceptos (art. 75.2.b RIRPF)' },
  { valor: TIPOS_RETENCION_MODELO_170.cesionImagen, etiqueta: '24% — Cesión de derechos de imagen' },
  { valor: TIPOS_RETENCION_MODELO_170.profesionalNuevoInicio, etiqueta: '7% — Profesionales de nuevo inicio (año de inicio + 2)' },
] as const

export function CalculadoraModelo170() {
  const [baseImponible, setBaseImponible] = useState('')
  const [tipoRetencion, setTipoRetencion] = useState<number>(TIPOS_RETENCION_MODELO_170.restoConceptos)

  const resultado = useMemo(
    () =>
      calcularModelo170({
        baseImponible: parseFloat(baseImponible) || 0,
        tipoRetencionPct: tipoRetencion,
      }),
    [baseImponible, tipoRetencion]
  )

  const hasData = parseFloat(baseImponible) > 0

  return (
    <div id="pdf-modelo-170" className="space-y-3">
      <BotonPDF elementId="pdf-modelo-170" filename="modelo-170" />
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" aria-hidden="true" />
            <div>
              <CardTitle>Modelo 170 — Retenciones agrupadas a un solo perceptor</CardTitle>
              <CardDescription>
                Declaración trimestral de retenciones del IRPF imputadas o agrupadas a un solo perceptor
                (trabajo, imagen, propiedad intelectual, asistencia técnica, bienes muebles).
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <LabelConAyuda htmlFor="m170-base" ayuda={GUIA_MODELO_170.baseImponible}>Base imponible trimestral (€)</LabelConAyuda>
            <Input id="m170-base" type="number" min="0" step="0.01" placeholder="9000" value={baseImponible} onChange={e => setBaseImponible(e.target.value)} />
          </div>
          <div className="space-y-2">
            <LabelConAyuda htmlFor="m170-tipo" ayuda={GUIA_MODELO_170.tipoRetencion}>Tipo de retención</LabelConAyuda>
            <select
              id="m170-tipo"
              value={String(tipoRetencion)}
              onChange={e => setTipoRetencion(parseInt(e.target.value, 10))}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm"
            >
              {OPCIONES_TIPO_RETENCION.map(op => (
                <option key={op.valor} value={op.valor}>{op.etiqueta}</option>
              ))}
            </select>
          </div>

          {hasData && (
            <dl className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg border p-3">
                <dt className="text-xs text-muted-foreground">Base imponible</dt>
                <dd className="text-lg font-semibold">{formatoEuros(resultado.baseImponible)}</dd>
              </div>
              <div className="rounded-lg border p-3">
                <dt className="text-xs text-muted-foreground">Tipo de retención</dt>
                <dd className="text-lg font-semibold">{resultado.tipoRetencion}%</dd>
              </div>
              <div className="rounded-lg border border-primary/50 bg-primary/5 p-3">
                <dt className="text-xs text-muted-foreground">Cuota retenida</dt>
                <dd className="text-lg font-bold text-primary">{formatoEuros(resultado.cuotaRetenida)}</dd>
              </div>
            </dl>
          )}

          {!hasData && (
            <p className="text-sm text-muted-foreground">
              Introduce la base imponible sobre la que practicar la retención.
            </p>
          )}

          <p className="text-xs text-muted-foreground">
            Cálculo orientativo. 19% para el resto de conceptos, 24% para cesión de derechos de imagen y
            7% para profesionales de nuevo inicio (año de inicio y los dos siguientes). El arrendamiento de
            inmuebles urbanos se declara en el modelo 115 (19%).
          </p>
        </CardContent>
      </Card>
    </div>
  )
}