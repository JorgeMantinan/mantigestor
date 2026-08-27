'use client'

import { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Minus, TrendingUp, FileWarning } from 'lucide-react'
import { calcularModelo222, type Modalidad222 } from '@mantigestor/utils'
import { LabelConAyuda } from './label-con-ayuda'
import { GUIA_MODELO_222 } from '@/lib/fiscal/guia-fiscal'
import { BotonPDF } from '@/components/boton-pdf'

const formatoEuros = (cents: number) =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(cents / 100)

const selectCls =
  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50'

export function CalculadoraModelo222() {
  const [modalidad, setModalidad] = useState<Modalidad222>('base')
  const [base, setBase] = useState('')
  const [cuotaAnterior, setCuotaAnterior] = useState('')
  const [cifra, setCifra] = useState('')
  const [esGrupo, setEsGrupo] = useState(false)
  const [pagosPrevios, setPagosPrevios] = useState('')

  const resultado = useMemo(
    () =>
      calcularModelo222({
        modalidad,
        baseImponibleCents: Math.round((parseFloat(base) || 0) * 100),
        cuotaIntegraAnteriorCents: Math.round((parseFloat(cuotaAnterior) || 0) * 100),
        cifraNegocios: parseFloat(cifra) || 0,
        esGrupoConsolidacion: esGrupo,
        pagosAnterioresCents: Math.round((parseFloat(pagosPrevios) || 0) * 100),
      }),
    [modalidad, base, cuotaAnterior, cifra, esGrupo, pagosPrevios]
  )

  const hasData =
    (modalidad === 'base' && parseFloat(base) > 0) ||
    (modalidad === 'cuota' && parseFloat(cuotaAnterior) > 0)

  return (
    <div id="pdf-modelo-222" className="space-y-3">
      <BotonPDF elementId="pdf-modelo-222" filename="modelo-222" />
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Minus className="h-5 w-5 text-primary" aria-hidden="true" />
            <div>
              <CardTitle>Modelo 222 — Pago fraccionado IS (grandes empresas y grupos)</CardTitle>
              <CardDescription>
                Pago fraccionado del Impuesto sobre Sociedades para grupos de consolidación fiscal y
                entidades con cifra de negocios ≥ 10 M€ (modalidad de base).
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <LabelConAyuda htmlFor="m222-modalidad" ayuda={GUIA_MODELO_222.modalidad}>Modalidad</LabelConAyuda>
              <select
                id="m222-modalidad"
                className={selectCls}
                value={modalidad}
                onChange={e => setModalidad(e.target.value as Modalidad222)}
              >
                <option value="base">Base (resultado del periodo)</option>
                <option value="cuota">Cuota (ejercicio anterior)</option>
              </select>
            </div>
            {modalidad === 'base' ? (
              <div className="space-y-2">
                <LabelConAyuda htmlFor="m222-base" ayuda={GUIA_MODELO_222.baseImponible}>Base imponible del periodo (€)</LabelConAyuda>
                <Input id="m222-base" type="number" step="0.01" placeholder="100000" value={base} onChange={e => setBase(e.target.value)} />
              </div>
            ) : (
              <div className="space-y-2">
                <LabelConAyuda htmlFor="m222-cuota" ayuda={GUIA_MODELO_222.cuotaIntegraAnterior}>Cuota íntegra ejercicio anterior (€)</LabelConAyuda>
                <Input id="m222-cuota" type="number" step="0.01" placeholder="50000" value={cuotaAnterior} onChange={e => setCuotaAnterior(e.target.value)} />
              </div>
            )}
            <div className="space-y-2">
              <LabelConAyuda htmlFor="m222-cifra" ayuda={GUIA_MODELO_222.cifraNegocios}>Cifra de negocios anterior (€)</LabelConAyuda>
              <Input id="m222-cifra" type="number" min="0" step="0.01" placeholder="15000000" value={cifra} onChange={e => setCifra(e.target.value)} />
            </div>
            <div className="space-y-2">
              <LabelConAyuda htmlFor="m222-previos" ayuda={GUIA_MODELO_222.pagosAnteriores}>Pagos anteriores (€)</LabelConAyuda>
              <Input id="m222-previos" type="number" min="0" step="0.01" placeholder="0" value={pagosPrevios} onChange={e => setPagosPrevios(e.target.value)} />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={esGrupo}
              onChange={e => setEsGrupo(e.target.checked)}
              className="h-4 w-4 rounded border-input accent-primary"
            />
            <span>La entidad tributa en régimen de grupos de consolidación fiscal</span>
          </label>

          {hasData && (
            <>
              <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-lg border p-3">
                  <dt className="text-xs text-muted-foreground">Modalidad aplicada</dt>
                  <dd className="text-sm font-semibold mt-1">{resultado.tipoAplicable}</dd>
                </div>
                <div className="rounded-lg border p-3">
                  <dt className="text-xs text-muted-foreground">Base de cálculo</dt>
                  <dd className="text-lg font-semibold">{formatoEuros(resultado.baseCalculoCents)}</dd>
                </div>
                <div className="rounded-lg border p-3">
                  <dt className="text-xs text-muted-foreground">Pago fraccionado del periodo</dt>
                  <dd className="text-lg font-semibold">{formatoEuros(resultado.pagoFraccionadoCents)}</dd>
                </div>
                <div className="rounded-lg border border-primary/50 bg-primary/5 p-3">
                  <dt className="text-xs text-muted-foreground">Total a ingresar</dt>
                  <dd className="text-lg font-bold flex items-center gap-1 text-primary">
                    <TrendingUp className="h-4 w-4" aria-hidden="true" />
                    {formatoEuros(resultado.totalAPagarCents)}
                  </dd>
                </div>
              </dl>

              {resultado.avisos.length > 0 && (
                <div className="space-y-1">
                  {resultado.avisos.map((a) => (
                    <p key={a} className="flex items-start gap-1.5 rounded-lg border border-amber-500/40 bg-amber-500/5 p-2 text-xs text-amber-700">
                      <FileWarning className="h-3.5 w-3.5 mt-0.5 shrink-0" aria-hidden="true" />
                      {a}
                    </p>
                  ))}
                </div>
              )}
            </>
          )}

          {!hasData && (
            <p className="text-sm text-muted-foreground">
              Introduce la base del período o la cuota del ejercicio anterior, la cifra de negocios y los pagos ya
              realizados para calcular el pago fraccionado.
            </p>
          )}

          <p className="text-xs text-muted-foreground">
            Plazos: 20 de abril, 20 de octubre y 20 de diciembre del ejercicio. El modelo 222 es obligatorio para
            grupos de consolidación y entidades con cifra de negocios ≥ 10 M€; el resto usa el modelo 202.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
