'use client'

import { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Calculator, Plus, Trash2, Landmark } from 'lucide-react'
import { calcularModelo123 } from '@mantigestor/utils'
import { LabelConAyuda } from './label-con-ayuda'
import { eur } from './types'

const eurosACentimos = (v: string): number => Math.round((parseFloat(v) || 0) * 100)

interface FilaConcepto {
  tipo: 'intereses' | 'dividendos' | 'otros'
  baseImponible: string
  retencionPct: string
}

const FILA_VACIA: FilaConcepto = { tipo: 'intereses', baseImponible: '', retencionPct: '19' }

const TIPO_LABELS: Record<string, string> = {
  intereses: 'Intereses',
  dividendos: 'Dividendos',
  otros: 'Otros rendimientos',
}

export function CalculadoraModelo123() {
  const [conceptos, setConceptos] = useState<FilaConcepto[]>([{ ...FILA_VACIA }])
  const [trimestre, setTrimestre] = useState<1 | 2 | 3 | 4>(1)

  const actualizar = (idx: number, campo: keyof FilaConcepto, valor: string) => {
    setConceptos(prev => prev.map((c, i) => {
      if (i !== idx) return c
      const actualizado = { ...c, [campo]: valor }
      // Auto-actualizar retención según tipo y base
      if (campo === 'tipo' || campo === 'baseImponible') {
        const tipo = campo === 'tipo' ? (valor as FilaConcepto['tipo']) : c.tipo
        const base = eurosACentimos(campo === 'baseImponible' ? valor : c.baseImponible)
        if (tipo === 'intereses' || tipo === 'dividendos') {
          const baseEur = base / 100
          actualizado.retencionPct = baseEur <= 6_000 ? '19' : baseEur <= 50_000 ? '21' : '23'
        } else {
          actualizado.retencionPct = '19'
        }
      }
      return actualizado
    }))
  }

  const agregarFila = () => setConceptos(prev => [...prev, { ...FILA_VACIA }])
  const eliminarFila = (idx: number) => setConceptos(prev => prev.filter((_, i) => i !== idx))

  const datosConceptos = useMemo(() =>
    conceptos
      .filter(c => parseFloat(c.baseImponible) > 0)
      .map(c => ({
        tipo: c.tipo,
        baseImponible: eurosACentimos(c.baseImponible),
        retencionPct: parseFloat(c.retencionPct) || 19,
      })),
    [conceptos]
  )

  const resultado = useMemo(() =>
    calcularModelo123({ conceptos: datosConceptos, trimestre }),
    [datosConceptos, trimestre]
  )

  const hasData = resultado.totalBase > 0

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Landmark className="h-5 w-5 text-primary" aria-hidden="true" />
          <div>
            <CardTitle>Modelo 123 — Retenciones capital mobiliario</CardTitle>
            <CardDescription>
              Retenciones sobre intereses, dividendos y otros rendimientos del capital mobiliario.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Trimestre */}
        <div className="flex gap-2">
          {([1, 2, 3, 4] as const).map(t => (
            <Button
              key={t}
              type="button"
              size="sm"
              variant={trimestre === t ? 'secondary' : 'outline'}
              onClick={() => setTrimestre(t)}
            >
              {t}º Trim
            </Button>
          ))}
        </div>

        {/* Tabla de conceptos */}
        <div className="space-y-2">
          {conceptos.map((c, idx) => (
            <div key={idx} className="grid gap-2 sm:grid-cols-[1fr_2fr_1fr_1fr_auto] items-end rounded-lg border p-3">
              <div className="space-y-1">
                <Label>Tipo</Label>
                <select
                  value={c.tipo}
                  onChange={e => actualizar(idx, 'tipo', e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                >
                  <option value="intereses">Intereses</option>
                  <option value="dividendos">Dividendos</option>
                  <option value="otros">Otros</option>
                </select>
              </div>
              <div className="space-y-1">
                <LabelConAyuda htmlFor={`base123-${idx}`}>Base imponible (€)</LabelConAyuda>
                <Input id={`base123-${idx}`} type="number" min="0" step="0.01" value={c.baseImponible} onChange={e => actualizar(idx, 'baseImponible', e.target.value)} placeholder="5000.00" />
              </div>
              <div className="space-y-1">
                <Label>Retención (%)</Label>
                <Input type="number" min="0" max="50" step="1" value={c.retencionPct} onChange={e => actualizar(idx, 'retencionPct', e.target.value)} />
              </div>
              <div className="space-y-1 hidden sm:block">
                <Label className="invisible">Retención estimada</Label>
                <p className="h-9 flex items-center text-sm text-muted-foreground">
                  {parseFloat(c.baseImponible) > 0 && (
                    <>{eur(eurosACentimos(c.baseImponible) * (parseFloat(c.retencionPct) / 100))}</>
                  )}
                </p>
              </div>
              {conceptos.length > 1 && (
                <Button type="button" variant="ghost" size="icon" className="h-9 w-9 text-destructive" onClick={() => eliminarFila(idx)}>
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </Button>
              )}
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={agregarFila}>
            <Plus className="mr-1 h-3 w-3" aria-hidden="true" />
            Añadir concepto
          </Button>
        </div>

        {/* Escala referencial */}
        <div className="rounded-lg border p-3 text-xs text-muted-foreground">
          <p className="font-medium mb-1">Escala art. 25.1 LIRPF (referencia)</p>
          <p>Hasta 6.000 €: 19% · 6.000-50.000 €: 21% · Más de 50.000 €: 23%</p>
        </div>

        {/* Resultado */}
        {hasData && (
          <dl className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border p-3">
              <dt className="text-xs text-muted-foreground">Total base imponible</dt>
              <dd className="text-lg font-semibold">{eur(resultado.totalBase)}</dd>
            </div>
            <div className="rounded-lg border border-primary/50 bg-primary/5 p-3">
              <dt className="text-xs text-muted-foreground">Total retenciones a ingresar</dt>
              <dd className="text-lg font-bold text-primary">{eur(resultado.totalRetenciones)}</dd>
            </div>
            <div className="rounded-lg border p-3">
              <dt className="text-xs text-muted-foreground">Trimestre</dt>
              <dd className="text-lg font-semibold">{resultado.trimestre}º</dd>
            </div>
          </dl>
        )}

        {/* Desglose */}
        {resultado.desglose.length > 0 && (
          <div className="rounded-lg border overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-3 py-2 text-left font-medium">Tipo</th>
                  <th className="px-3 py-2 text-right font-medium">Base</th>
                  <th className="px-3 py-2 text-right font-medium">Ret. %</th>
                  <th className="px-3 py-2 text-right font-medium">Retención</th>
                </tr>
              </thead>
              <tbody>
                {resultado.desglose.map((d, i) => (
                  <tr key={i} className="border-b last:border-0">
                    <td className="px-3 py-2">{TIPO_LABELS[d.tipo] ?? d.tipo}</td>
                    <td className="px-3 py-2 text-right">{eur(d.baseImponible)}</td>
                    <td className="px-3 py-2 text-right">{d.retencionPct}%</td>
                    <td className="px-3 py-2 text-right font-medium">{eur(d.retencion)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!hasData && (
          <p className="text-sm text-muted-foreground flex items-center gap-2">
            <Landmark className="h-4 w-4" aria-hidden="true" />
            Introduce al menos un concepto de capital mobiliario para calcular las retenciones.
          </p>
        )}

        <p className="text-xs text-muted-foreground">
          Modelo 123 orientativo. El tipo de retención se aplica según la escala del art. 25.1 LIRPF
          para intereses y dividendos. Presentación: 1-20 del mes siguiente al trimestre.
        </p>
      </CardContent>
    </Card>
  )
}
