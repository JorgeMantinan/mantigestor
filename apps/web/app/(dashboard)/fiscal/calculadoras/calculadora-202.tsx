'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { LabelConAyuda } from './label-con-ayuda'
import { calcularModelo202, ETIQUETA_ENTIDAD_202, type Modalidad202, type Entidad202 } from '@mantigestor/utils'
import { eur } from './types'
import { BotonPDF } from '@/components/boton-pdf'

interface Props {
  taxYear: number
}

export function Calculadora202({ taxYear }: Props) {
  const [modalidad, setModalidad] = useState<Modalidad202>('cuota')
  const [entidad, setEntidad] = useState<Entidad202>('general')
  const [cifraNegocios10M, setCifraNegocios10M] = useState(false)
  const [cuotaIntegra, setCuotaIntegra] = useState('')
  const [baseImponible, setBaseImponible] = useState('')
  const [pagosAnteriores, setPagosAnteriores] = useState('')

  const resultado = useMemo(() => {
    try {
      return calcularModelo202({
        modalidad,
        entidad,
        cifraNegocios10M,
        cuotaIntegraUltimoPeriodoCents: Math.round((parseFloat(cuotaIntegra) || 0) * 100),
        baseImponiblePeriodoCents: Math.round((parseFloat(baseImponible) || 0) * 100),
        pagosAnterioresCents: Math.round((parseFloat(pagosAnteriores) || 0) * 100),
      })
    } catch {
      return null
    }
  }, [modalidad, entidad, cifraNegocios10M, cuotaIntegra, baseImponible, pagosAnteriores])

  return (
    <div id="pdf-modelo-202" className="space-y-3">
      <BotonPDF elementId="pdf-modelo-202" filename="modelo-202" />
      <Card>
      <CardHeader>
        <CardTitle>Modelo 202 — Pago fraccionado IS {taxYear}</CardTitle>
        <CardDescription>
          Pagos fraccionados del Impuesto sobre Sociedades (art. 40 LIS): modalidad cuota íntegra
          (18 %) u opcional por base imponible (5/7 o 19/20 del tipo de gravamen; obligatoria si la
          cifra de negocios supera 6.000.000 €).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <LabelConAyuda
              htmlFor="s202-modalidad"
              ayuda={{
                titulo: 'Modalidad de cálculo',
                contenido:
                  'Cuota íntegra (art. 40.2): 18 % sobre la cuota del último período presentado. Base imponible (art. 40.3): 5/7 del tipo (redondeado por defecto) si la cifra de negocios es inferior a 10 M€ — con tipo general: 17 % — o 19/20 del tipo (redondeado por exceso) si es igual o superior — con tipo general: 24 %. Obligatoria la de base si la cifra de negocios supera 6.000.000 €.',
              }}
            >
              Modalidad
            </LabelConAyuda>
            <select
              id="s202-modalidad"
              value={modalidad}
              onChange={e => setModalidad(e.target.value as Modalidad202)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="cuota">Cuota íntegra (18 %) — art. 40.2</option>
              <option value="base">Base imponible — art. 40.3</option>
            </select>
          </div>

          <div className="space-y-2">
            <LabelConAyuda
              htmlFor="s202-entidad"
              ayuda={{
                titulo: 'Tipo de gravamen de la entidad',
                contenido:
                  'Se usa para calcular el porcentaje de la modalidad por base (5/7 o 19/20 del tipo). Tipos vigentes en 2026: general 25 %, reducida dimensión 23 %, micropyme 21 % (tramo de más de 50.000 €), nueva creación 15 %.',
              }}
            >
              Entidad
            </LabelConAyuda>
            <select
              id="s202-entidad"
              value={entidad}
              onChange={e => setEntidad(e.target.value as Entidad202)}
              disabled={modalidad === 'cuota'}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:opacity-50"
            >
              {(Object.keys(ETIQUETA_ENTIDAD_202) as Entidad202[]).map(k => (
                <option key={k} value={k}>
                  {ETIQUETA_ENTIDAD_202[k]}
                </option>
              ))}
            </select>
          </div>
        </div>

        {modalidad === 'base' && (
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={cifraNegocios10M}
              onChange={e => setCifraNegocios10M(e.target.checked)}
            />
            La cifra de negocios de la entidad es igual o superior a 10.000.000 € (19/20 del tipo,
            redondeado por exceso)
          </label>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          {modalidad === 'cuota' ? (
            <div className="space-y-2">
              <LabelConAyuda
                htmlFor="s202-cuota"
                ayuda={{
                  titulo: 'Cuota íntegra minorada',
                  contenido:
                    'Cuota íntegra del último período presentado, minorada por deducciones, bonificaciones y retenciones e ingresos a cuenta (art. 40.2 LIS).',
                }}
              >
                Cuota íntegra minorada último periodo (€)
              </LabelConAyuda>
              <Input
                id="s202-cuota"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={cuotaIntegra}
                onChange={e => setCuotaIntegra(e.target.value)}
              />
            </div>
          ) : (
            <div className="space-y-2">
              <LabelConAyuda
                htmlFor="s202-base"
                ayuda={{
                  titulo: 'Base imponible del periodo',
                  contenido:
                    'Base imponible de los 3, 9 u 11 primeros meses (según el plazo) minorada en bonificaciones, retenciones e ingresos a cuenta (art. 40.3 LIS).',
                }}
              >
                Base imponible del periodo (€)
              </LabelConAyuda>
              <Input
                id="s202-base"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={baseImponible}
                onChange={e => setBaseImponible(e.target.value)}
              />
            </div>
          )}
          <div className="space-y-2">
            <LabelConAyuda
              htmlFor="s202-pagos"
              ayuda={{
                titulo: 'Pagos fraccionados anteriores',
                contenido: 'Pagos fraccionados ya ingresados en el ejercicio (se minoran en la modalidad por base).',
              }}
            >
              Pagos anteriores del año (€)
            </LabelConAyuda>
            <Input
              id="s202-pagos"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={pagosAnteriores}
              onChange={e => setPagosAnteriores(e.target.value)}
            />
          </div>
        </div>

        {resultado && (
          <div className="rounded-lg border p-4 space-y-3">
            <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div className="rounded bg-muted/50 p-3">
                <dt className="text-xs text-muted-foreground">Tipo aplicable</dt>
                <dd className="text-sm font-medium">{resultado.tipoAplicable}</dd>
              </div>
              <div className="rounded bg-muted/50 p-3">
                <dt className="text-xs text-muted-foreground">Base de cálculo</dt>
                <dd className="text-lg font-bold">{eur(resultado.baseCalculoCents)}</dd>
              </div>
              <div className="rounded bg-muted/50 p-3">
                <dt className="text-xs text-muted-foreground">Importe por plazo</dt>
                <dd className="text-lg font-bold">{eur(resultado.pagoTrimestralCents)}</dd>
              </div>
              <div className="rounded bg-muted/50 p-3">
                <dt className="text-xs text-muted-foreground">Pagos anteriores</dt>
                <dd className="text-lg font-semibold">{eur(resultado.pagosAnterioresCents)}</dd>
              </div>
              <div className="rounded border border-primary/50 bg-primary/5 p-3">
                <dt className="text-xs text-muted-foreground">Total a pagar este plazo</dt>
                <dd className="text-xl font-bold text-primary">{eur(resultado.totalAPagarCents)}</dd>
              </div>
              <div className="rounded bg-muted/50 p-3">
                <dt className="text-xs text-muted-foreground">Total año (3 plazos: abr, oct, dic)</dt>
                <dd className="text-lg font-semibold">{eur(resultado.totalAnualEstimadoCents)}</dd>
              </div>
            </dl>
          </div>
        )}
      </CardContent>
    </Card>
    </div>
  )
}
