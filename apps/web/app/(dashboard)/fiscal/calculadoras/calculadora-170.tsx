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
  { valor: TIPOS_RETENCION_MODELO_170.personaFisica, etiqueta: '19% — Arrendador persona física' },
  { valor: TIPOS_RETENCION_MODELO_170.empresarioProfesional, etiqueta: '24% — Arrendatario empresario/profesional' },
] as const

export function CalculadoraModelo170() {
  const [baseImponible, setBaseImponible] = useState('')
  const [tipoRetencion, setTipoRetencion] = useState<number>(TIPOS_RETENCION_MODELO_170.personaFisica)

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
              <CardTitle>Modelo 170 — Retenciones arrendamientos urbanos</CardTitle>
              <CardDescription>
                Declaración trimestral de las retenciones del IRPF sobre arrendamientos de inmuebles urbanos.
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
              Introduce la base imponible del arrendamiento para calcular la retención a ingresar.
            </p>
          )}

          <p className="text-xs text-muted-foreground">
            Cálculo orientativo. El 19% aplica cuando el arrendador es persona física; el 24% cuando el
            arrendatario es empresario o profesional en actividad (regla general desde 2015). Presentación trimestral.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}