'use client'

import { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Store, FileCheck2 } from 'lucide-react'
import { calcularModelo036, type TipoActividad, type RegimenIva } from '@mantigestor/utils'
import { LabelConAyuda } from './label-con-ayuda'
import { GUIA_MODELO_036 } from '@/lib/fiscal/guia-fiscal'
import { BotonPDF } from '@/components/boton-pdf'

const formatoEuros = (euros: number) =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(euros)

const REGIMEN_LABEL: Record<RegimenIva, string> = {
  simplificado: 'Régimen simplificado (módulos)',
  general: 'Régimen general',
  general_simplificado: 'General + simplificado agrario',
}

export function CalculadoraModelo036() {
  const [volumen, setVolumen] = useState('')
  const [tipo, setTipo] = useState<TipoActividad>('empresarial')
  const [base, setBase] = useState('')
  const [meses, setMeses] = useState('')

  const resultado = useMemo(
    () =>
      calcularModelo036({
        volumenOperaciones: parseFloat(volumen) || 0,
        tipoActividad: tipo,
        baseCotizacion: parseFloat(base) || undefined,
        mesesTarifaPlana: parseFloat(meses) || 0,
      }),
    [volumen, tipo, base, meses]
  )

  const hasData = parseFloat(volumen) > 0

  return (
    <div id="pdf-modelo-036" className="space-y-3">
      <BotonPDF elementId="pdf-modelo-036" filename="modelo-036" />
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Store className="h-5 w-5 text-primary" aria-hidden="true" />
            <div>
              <CardTitle>Modelo 036/037 — Alta censal de actividad</CardTitle>
              <CardDescription>
                Declaración censal de alta en el censo de empresarios y profesionales. Asistente para elegir
                régimen de IVA, estimar la cuota RETA y preparar los pasos del alta.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <LabelConAyuda htmlFor="m036-volumen" ayuda={GUIA_MODELO_036.volumenOperaciones}>Volumen de operaciones (€/año)</LabelConAyuda>
              <Input id="m036-volumen" type="number" min="0" step="0.01" placeholder="60000" value={volumen} onChange={e => setVolumen(e.target.value)} />
            </div>
            <div className="space-y-2">
              <LabelConAyuda htmlFor="m036-tipo" ayuda={GUIA_MODELO_036.tipoActividad}>Tipo de actividad</LabelConAyuda>
              <select
                id="m036-tipo"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={tipo}
                onChange={e => setTipo(e.target.value as TipoActividad)}
              >
                <option value="empresarial">Empresarial (comercio, hostelería, taller…)</option>
                <option value="profesional">Profesional (abogado, ingeniero, consultor…)</option>
              </select>
            </div>
            <div className="space-y-2">
              <LabelConAyuda htmlFor="m036-base" ayuda={GUIA_MODELO_036.baseCotizacion}>Base de cotización RETA (€/mes)</LabelConAyuda>
              <Input id="m036-base" type="number" min="0" step="0.01" placeholder="1600" value={base} onChange={e => setBase(e.target.value)} />
            </div>
            <div className="space-y-2">
              <LabelConAyuda htmlFor="m036-meses" ayuda={GUIA_MODELO_036.mesesTarifaPlana}>Meses con tarifa plana</LabelConAyuda>
              <Input id="m036-meses" type="number" min="0" max="12" step="1" placeholder="12" value={meses} onChange={e => setMeses(e.target.value)} />
            </div>
          </div>

          {hasData && (
            <>
              <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-lg border p-3">
                  <dt className="text-xs text-muted-foreground">Régimen de IVA recomendado</dt>
                  <dd className="text-sm font-semibold mt-1">{REGIMEN_LABEL[resultado.regimenRecomendado]}</dd>
                </div>
                <div className="rounded-lg border p-3">
                  <dt className="text-xs text-muted-foreground">Cuota RETA mensual</dt>
                  <dd className="text-lg font-bold text-primary mt-1">{formatoEuros(resultado.cuotaRETA)}</dd>
                </div>
                <div className="rounded-lg border p-3">
                  <dt className="text-xs text-muted-foreground">Ahorro tarifa plana</dt>
                  <dd className="text-lg font-semibold text-green-600 mt-1">{formatoEuros(resultado.tarifaPlana)}</dd>
                </div>
                <div className="rounded-lg border p-3">
                  <dt className="text-xs text-muted-foreground">IVA simplificado</dt>
                  <dd className="text-sm font-semibold mt-1">{resultado.ivsimplificado ? 'Sí aplica' : 'No aplica (general)'}</dd>
                </div>
              </dl>

              <div className="space-y-2">
                <p className="text-sm font-medium flex items-center gap-2">
                  <FileCheck2 className="h-4 w-4 text-primary" aria-hidden="true" />
                  Pasos para el alta censal
                </p>
                <ol className="space-y-2">
                  {resultado.resumenAlta.map((paso, i) => (
                    <li key={paso.titulo} className="rounded-lg border bg-muted/30 p-3 text-sm">
                      <span className="font-semibold">{i + 1}. {paso.titulo}</span>
                      <p className="text-muted-foreground mt-0.5">{paso.descripcion}</p>
                    </li>
                  ))}
                </ol>
              </div>
            </>
          )}

          {!hasData && (
            <p className="text-sm text-muted-foreground">
              Introduce el volumen de operaciones previsto para el primer año para orientar tu alta censal.
            </p>
          )}

          <p className="text-xs text-muted-foreground">
            Orientativo y verificado según normativa vigente. El 037 es la versión simplificada del 036 para
            autónomos personas físicas. La cuota RETA usa el tipo de 2026 (29,7%); con la tarifa plana los
            primeros meses la cuota es reducida (80 € aproximadamente) si cumples requisitos.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
