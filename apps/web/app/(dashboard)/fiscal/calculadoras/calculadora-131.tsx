'use client'

import { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Calculator, Plus, Trash2 } from 'lucide-react'
import { calcularModelo131, tipoRetencionCapitalMobiliario } from '@mantigestor/utils'
import { LabelConAyuda } from './label-con-ayuda'
import { GUIA_MODELO_131 } from '@/lib/fiscal/guia-fiscal'
import { BotonPDF } from '@/components/boton-pdf'
import { eur } from './types'

const eurosACentimos = (v: string): number => Math.round((parseFloat(v) || 0) * 100)

interface FilaActividad {
  concepto: string
  clave: string
  unidades: string
  precioUnitario: string
  tipoIRPF: string
}

const FILA_VACIA: FilaActividad = { concepto: '', clave: '', unidades: '', precioUnitario: '', tipoIRPF: '19' }

export function CalculadoraModelo131() {
  const [actividades, setActividades] = useState<FilaActividad[]>([{ ...FILA_VACIA }])
  const [pagosAnteriores, setPagosAnteriores] = useState('')

  const actualizar = (idx: number, campo: keyof FilaActividad, valor: string) => {
    setActividades(prev => prev.map((a, i) => i === idx ? { ...a, [campo]: valor } : a))
  }

  const agregarFila = () => setActividades(prev => [...prev, { ...FILA_VACIA }])
  const eliminarFila = (idx: number) => setActividades(prev => prev.filter((_, i) => i !== idx))

  const datosActividades = useMemo(() =>
    actividades
      .filter(a => a.concepto && parseFloat(a.unidades) > 0 && parseFloat(a.precioUnitario) > 0)
      .map(a => ({
        concepto: a.concepto,
        clave: a.clave,
        unidades: parseFloat(a.unidades) || 0,
        precioUnitario: eurosACentimos(a.precioUnitario),
        tipoIRPF: parseFloat(a.tipoIRPF) || 19,
      })),
    [actividades]
  )

  const resultado = useMemo(() =>
    calcularModelo131({
      actividades: datosActividades,
      pagosAnteriores: eurosACentimos(pagosAnteriores),
    }),
    [datosActividades, pagosAnteriores]
  )

  const hasData = resultado.baseImponible > 0

  return (
    <div id="pdf-modelo-131" className="space-y-3">
      <BotonPDF elementId="pdf-modelo-131" filename="modelo-131" />
      <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Calculator className="h-5 w-5 text-primary" aria-hidden="true" />
          <div>
            <CardTitle>Modelo 131 — Estimación objetiva (módulos)</CardTitle>
            <CardDescription>
              Declaración trimestral para autónomos en módulos. Introduce unidades y módulos de cada actividad.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Tabla de actividades */}
        <div className="space-y-2">
          {actividades.map((act, idx) => (
            <div key={idx} className="grid gap-2 sm:grid-cols-[2fr_1fr_1fr_1fr_1fr_auto] items-end rounded-lg border p-3">
              <div className="space-y-1">
                <Label>Concepto</Label>
                <Input value={act.concepto} onChange={e => actualizar(idx, 'concepto', e.target.value)} placeholder="Ej: Hostelería" />
              </div>
              <div className="space-y-1">
                <Label>Clave</Label>
                <Input value={act.clave} onChange={e => actualizar(idx, 'clave', e.target.value)} placeholder="Ej: H071" />
              </div>
              <div className="space-y-1">
                <Label>Unidades</Label>
                <Input type="number" min="0" step="1" value={act.unidades} onChange={e => actualizar(idx, 'unidades', e.target.value)} placeholder="100" />
              </div>
              <div className="space-y-1">
                <LabelConAyuda htmlFor={`precio-${idx}`} ayuda={GUIA_MODELO_131.activosFijos}>Módulo/precio (€)</LabelConAyuda>
                <Input id={`precio-${idx}`} type="number" min="0" step="0.01" value={act.precioUnitario} onChange={e => actualizar(idx, 'precioUnitario', e.target.value)} placeholder="50.00" />
              </div>
              <div className="space-y-1">
                <Label>Tipo IRPF (%)</Label>
                <Input type="number" min="0" max="50" step="1" value={act.tipoIRPF} onChange={e => actualizar(idx, 'tipoIRPF', e.target.value)} />
              </div>
              {actividades.length > 1 && (
                <Button type="button" variant="ghost" size="icon" className="h-9 w-9 text-destructive" onClick={() => eliminarFila(idx)}>
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </Button>
              )}
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={agregarFila}>
            <Plus className="mr-1 h-3 w-3" aria-hidden="true" />
            Añadir actividad
          </Button>
        </div>

        <div className="max-w-xs space-y-2">
          <LabelConAyuda htmlFor="m131-pagos">Pagos anteriores del año (€)</LabelConAyuda>
          <Input id="m131-pagos" type="number" min="0" step="0.01" value={pagosAnteriores} onChange={e => setPagosAnteriores(e.target.value)} placeholder="0" />
        </div>

        {/* Resultado */}
        {hasData && (
          <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border p-3">
              <dt className="text-xs text-muted-foreground">Base imponible trimestre</dt>
              <dd className="text-lg font-semibold">{eur(resultado.baseImponible)}</dd>
            </div>
            <div className="rounded-lg border p-3">
              <dt className="text-xs text-muted-foreground">Cuota íntegra trimestre</dt>
              <dd className="text-lg font-semibold">{eur(resultado.cuotaIntegra)}</dd>
            </div>
            {resultado.pagosAnteriores > 0 && (
              <div className="rounded-lg border p-3">
                <dt className="text-xs text-muted-foreground">Pagos anteriores</dt>
                <dd className="text-lg font-semibold text-muted-foreground">{eur(resultado.pagosAnteriores)}</dd>
              </div>
            )}
            <div className={`rounded-lg border p-3 ${resultado.aDevolver > 0 ? 'border-green-500/50 bg-green-500/5' : 'border-primary/50 bg-primary/5'}`}>
              <dt className="text-xs text-muted-foreground">
                {resultado.aDevolver > 0 ? 'Devolución' : 'A ingresar'}
              </dt>
              <dd className={`text-lg font-bold ${resultado.aDevolver > 0 ? 'text-green-600' : 'text-primary'}`}>
                {eur(resultado.aDevolver > 0 ? resultado.aDevolver : resultado.aIngresar)}
              </dd>
            </div>
          </dl>
        )}

        {/* Desglose */}
        {resultado.desglose.length > 0 && (
          <div className="rounded-lg border overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-3 py-2 text-left font-medium">Actividad</th>
                  <th className="px-3 py-2 text-left font-medium">Clave</th>
                  <th className="px-3 py-2 text-right font-medium">Base</th>
                  <th className="px-3 py-2 text-right font-medium">Cuota</th>
                </tr>
              </thead>
              <tbody>
                {resultado.desglose.map((d, i) => (
                  <tr key={i} className="border-b last:border-0">
                    <td className="px-3 py-2">{d.concepto}</td>
                    <td className="px-3 py-2 text-muted-foreground">{d.clave}</td>
                    <td className="px-3 py-2 text-right">{eur(d.baseImponible)}</td>
                    <td className="px-3 py-2 text-right font-medium">{eur(d.cuota)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!hasData && (
          <p className="text-sm text-muted-foreground flex items-center gap-2">
            <Calculator className="h-4 w-4" aria-hidden="true" />
            Introduce al menos una actividad con unidades y módulo para calcular.
          </p>
        )}

        <p className="text-xs text-muted-foreground">
          Modelo 131 orientativo. El cálculo real depende de los módulos oficiales de tu comunidad autónoma
          y de las circunstancias particulares de cada actividad.
        </p>
      </CardContent>
    </Card>
    </div>
  )
}
