'use client'

import { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { eur, parseEuros } from './types'
import { LabelConAyuda } from './label-con-ayuda'
import { GUIA_MODELO_200 } from '@/lib/fiscal/guia-fiscal'
import { BotonPDF } from '@/components/boton-pdf'
import { calcularModelo200, TIPOS_ENTIDAD, tipoImpositivo } from '@mantigestor/utils'
import type { DatosModelo200 } from '@mantigestor/utils'

export function CalculadoraModelo200() {
  const [tipoEntidad, setTipoEntidad] = useState<string>('SL')
  const [ingresos, setIngresos] = useState('')
  const [gastosExplot, setGastosExplot] = useState('')
  const [gastosFinanc, setGastosFinanc] = useState('')
  const [resultadoContable, setResultadoContable] = useState('')
  const [ajustes, setAjustes] = useState('')
  const [basesNeg, setBasesNeg] = useState('')
  const [deducciones, setDeducciones] = useState('')
  const [pagosFrac, setPagosFrac] = useState('')
  const [retenciones, setRetenciones] = useState('')

  const resultado = useMemo(() => {
    const base = parseEuros(resultadoContable)
    const ing = parseEuros(ingresos)
    const gastosE = parseEuros(gastosExplot)
    const gastosF = parseEuros(gastosFinanc)

    if (base === null || ing === null) return null

    const datos: DatosModelo200 = {
      tipoEntidad: tipoEntidad as DatosModelo200['tipoEntidad'],
      cif: '',
      denominacion: '',
      ejercicio: new Date().getFullYear(),
      fechaInicio: '',
      fechaFin: '',
      ingresosExplotacion: ing,
      otrosIngresos: 0,
      gastosExplotacion: gastosE ?? 0,
      gastosFinancieros: gastosF ?? 0,
      resultadosExtranjeros: 0,
      resultadoContable: base,
      ajustesFiscales: parseEuros(ajustes) ?? 0,
      baseImponible: 0,
      basesNegativasArrastradas: parseEuros(basesNeg) ?? 0,
      basesNegativasAnoActual: 0,
      tipoImpositivo: 0,
      cuotaIntegra: 0,
      deducciones: parseEuros(deducciones) ?? 0,
      cuotaLiquida: 0,
      pagosFraccionados: parseEuros(pagosFrac) ?? 0,
      retenciones: parseEuros(retenciones) ?? 0,
      percepiones: 0,
      resultadoADevolver: 0,
      resultadoAPagar: 0,
    }

    return calcularModelo200(datos)
  }, [tipoEntidad, ingresos, gastosExplot, gastosFinanc, resultadoContable, ajustes, basesNeg, deducciones, pagosFrac, retenciones])

  const tipo = tipoImpositivo(tipoEntidad, false, parseEuros(ingresos) ?? 0)

  return (
    <div id="pdf-modelo-200" className="space-y-3">
      <BotonPDF elementId="pdf-modelo-200" filename="modelo-200" />
      <Card>
      <CardHeader>
        <CardTitle>Modelo 200 — Impuesto sobre Sociedades</CardTitle>
        <CardDescription>Declaración anual del impuesto de sociedades</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="max-w-sm space-y-2">
          <Label>Tipo de entidad</Label>
          <select value={tipoEntidad} onChange={e => setTipoEntidad(e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
            {TIPOS_ENTIDAD.map(t => <option key={t.valor} value={t.valor}>{t.label}</option>)}
          </select>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <LabelConAyuda htmlFor="ingresosExplotacion" ayuda={GUIA_MODELO_200.ingresosExplotacion}>Ingresos de explotación (€)</LabelConAyuda>
            <Input id="ingresosExplotacion" type="number" step="0.01" value={ingresos} onChange={e => setIngresos(e.target.value)} placeholder="0.00" />
          </div>
          <div className="space-y-2">
            <LabelConAyuda htmlFor="gastosExplotacion" ayuda={GUIA_MODELO_200.gastosExplotacion}>Gastos de explotación (€)</LabelConAyuda>
            <Input id="gastosExplotacion" type="number" step="0.01" value={gastosExplot} onChange={e => setGastosExplot(e.target.value)} placeholder="0.00" />
          </div>
          <div className="space-y-2">
            <Label>Gastos financieros (€)</Label>
            <Input type="number" step="0.01" value={gastosFinanc} onChange={e => setGastosFinanc(e.target.value)} placeholder="0.00" />
          </div>
        </div>

        <hr />

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <LabelConAyuda htmlFor="resultadoContable" ayuda={GUIA_MODELO_200.resultadoContable}>Resultado contable (€)</LabelConAyuda>
            <Input id="resultadoContable" type="number" step="0.01" value={resultadoContable} onChange={e => setResultadoContable(e.target.value)} placeholder="0.00" />
          </div>
          <div className="space-y-2">
            <Label>Ajustes fiscales (€)</Label>
            <Input type="number" step="0.01" value={ajustes} onChange={e => setAjustes(e.target.value)} placeholder="0.00" />
            <p className="text-xs text-muted-foreground">Positivos suman, negativos restan</p>
          </div>
          <div className="space-y-2">
            <Label>Bases negativas anteriores (€)</Label>
            <Input type="number" step="0.01" value={basesNeg} onChange={e => setBasesNeg(e.target.value)} placeholder="0.00" />
          </div>
          <div className="space-y-2">
            <LabelConAyuda htmlFor="deducciones" ayuda={GUIA_MODELO_200.deducciones}>Deducciones (€)</LabelConAyuda>
            <Input id="deducciones" type="number" step="0.01" value={deducciones} onChange={e => setDeducciones(e.target.value)} placeholder="0.00" />
          </div>
        </div>

        <hr />

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label>Pagos fraccionados (€)</Label>
            <Input type="number" step="0.01" value={pagosFrac} onChange={e => setPagosFrac(e.target.value)} placeholder="0.00" />
          </div>
          <div className="space-y-2">
            <Label>Retenciones (€)</Label>
            <Input type="number" step="0.01" value={retenciones} onChange={e => setRetenciones(e.target.value)} placeholder="0.00" />
          </div>
        </div>

        {resultado && (
          <div className="space-y-3">
            <dl className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border p-3">
                <dt className="text-xs text-muted-foreground">Tipo impositivo</dt>
                <dd className="text-lg font-semibold">{resultado.tipoImpositivo}%</dd>
              </div>
              <div className="rounded-lg border p-3">
                <dt className="text-xs text-muted-foreground">Cuota íntegra</dt>
                <dd className="text-lg font-semibold">{eur(resultado.cuotaIntegra)}</dd>
              </div>
              <div className="rounded-lg border border-primary/50 bg-primary/5 p-3">
                <dt className="text-xs text-muted-foreground">Cuota líquida</dt>
                <dd className="text-lg font-bold text-primary">{eur(resultado.cuotaLiquida)}</dd>
              </div>
              {resultado.totalAPagar > 0 && (
                <div className="rounded-lg border border-red-500/50 bg-red-500/5 p-3">
                  <dt className="text-xs text-muted-foreground">Total a pagar</dt>
                  <dd className="text-lg font-bold text-red-600">{eur(resultado.totalAPagar)}</dd>
                </div>
              )}
              {resultado.totalADevolver > 0 && (
                <div className="rounded-lg border border-green-500/50 bg-green-500/5 p-3">
                  <dt className="text-xs text-muted-foreground">Total a devolver</dt>
                  <dd className="text-lg font-bold text-green-600">{eur(resultado.totalADevolver)}</dd>
                </div>
              )}
            </dl>

            {resultado.observaciones.length > 0 && (
              <ul className="space-y-1 text-xs text-muted-foreground">
                {resultado.observaciones.map((obs, i) => <li key={i}>• {obs}</li>)}
              </ul>
            )}
          </div>
        )}
      </CardContent>
    </Card>
    </div>
  )
}
