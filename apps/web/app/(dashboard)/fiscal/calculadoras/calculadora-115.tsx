'use client'

import { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Calculator, Plus, Trash2, Home } from 'lucide-react'
import { calcularModelo115 } from '@mantigestor/utils'
import { LabelConAyuda } from './label-con-ayuda'
import { BotonPDF } from '@/components/boton-pdf'
import { eur } from './types'

const eurosACentimos = (v: string): number => Math.round((parseFloat(v) || 0) * 100)

interface FilaInmueble {
  direccion: string
  nifArrendatario: string
  baseImponible: string
  retencionPct: string
}

const FILA_VACIA: FilaInmueble = { direccion: '', nifArrendatario: '', baseImponible: '', retencionPct: '19' }

export function CalculadoraModelo115() {
  const [inmuebles, setInmuebles] = useState<FilaInmueble[]>([{ ...FILA_VACIA }])
  const [trimestre, setTrimestre] = useState<1 | 2 | 3 | 4>(1)

  const actualizar = (idx: number, campo: keyof FilaInmueble, valor: string) => {
    setInmuebles(prev => prev.map((a, i) => i === idx ? { ...a, [campo]: valor } : a))
  }

  const agregarFila = () => setInmuebles(prev => [...prev, { ...FILA_VACIA }])
  const eliminarFila = (idx: number) => setInmuebles(prev => prev.filter((_, i) => i !== idx))

  const datosInmuebles = useMemo(() =>
    inmuebles
      .filter(inm => inm.direccion && parseFloat(inm.baseImponible) > 0)
      .map(inm => ({
        direccion: inm.direccion,
        nifArrendatario: inm.nifArrendatario,
        baseImponible: eurosACentimos(inm.baseImponible),
        retencionPct: parseFloat(inm.retencionPct) || 19,
      })),
    [inmuebles]
  )

  const resultado = useMemo(() =>
    calcularModelo115({ inmuebles: datosInmuebles, trimestre }),
    [datosInmuebles, trimestre]
  )

  const hasData = resultado.totalBaseImponible > 0

  return (
    <div id="pdf-modelo-115" className="space-y-3">
      <BotonPDF elementId="pdf-modelo-115" filename="modelo-115" />
      <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Home className="h-5 w-5 text-primary" aria-hidden="true" />
          <div>
            <CardTitle>Modelo 115 — Retenciones arrendamientos</CardTitle>
            <CardDescription>
              Retenciones sobre alquileres de inmuebles urbanos. Presentación trimestral.
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

        {/* Tabla de inmuebles */}
        <div className="space-y-2">
          {inmuebles.map((inm, idx) => (
            <div key={idx} className="grid gap-2 sm:grid-cols-[2fr_1fr_1fr_1fr_auto] items-end rounded-lg border p-3">
              <div className="space-y-1">
                <Label>Dirección del inmueble</Label>
                <Input value={inm.direccion} onChange={e => actualizar(idx, 'direccion', e.target.value)} placeholder="Calle Mayor 1, 2ºA" />
              </div>
              <div className="space-y-1">
                <Label>NIF arrendatario</Label>
                <Input value={inm.nifArrendatario} onChange={e => actualizar(idx, 'nifArrendatario', e.target.value)} placeholder="12345678A" />
              </div>
              <div className="space-y-1">
                <LabelConAyuda htmlFor={`base-${idx}`}>Renta trimestre (€)</LabelConAyuda>
                <Input id={`base-${idx}`} type="number" min="0" step="0.01" value={inm.baseImponible} onChange={e => actualizar(idx, 'baseImponible', e.target.value)} placeholder="1200.00" />
              </div>
              <div className="space-y-1">
                <Label>Retención (%)</Label>
                <Input type="number" min="0" max="50" step="1" value={inm.retencionPct} onChange={e => actualizar(idx, 'retencionPct', e.target.value)} />
              </div>
              {inmuebles.length > 1 && (
                <Button type="button" variant="ghost" size="icon" className="h-9 w-9 text-destructive" onClick={() => eliminarFila(idx)}>
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </Button>
              )}
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={agregarFila}>
            <Plus className="mr-1 h-3 w-3" aria-hidden="true" />
            Añadir inmueble
          </Button>
        </div>

        {/* Resultado */}
        {hasData && (
          <dl className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border p-3">
              <dt className="text-xs text-muted-foreground">Total base imponible</dt>
              <dd className="text-lg font-semibold">{eur(resultado.totalBaseImponible)}</dd>
            </div>
            <div className="rounded-lg border border-primary/50 bg-primary/5 p-3">
              <dt className="text-xs text-muted-foreground">Total retenciones a ingresar</dt>
              <dd className="text-lg font-bold text-primary">{eur(resultado.totalRetenciones)}</dd>
            </div>
            <div className="rounded-lg border p-3">
              <dt className="text-xs text-muted-foreground">Nº inmuebles</dt>
              <dd className="text-lg font-semibold">{resultado.numInmuebles}</dd>
            </div>
          </dl>
        )}

        {/* Desglose */}
        {resultado.desglose.length > 0 && (
          <div className="rounded-lg border overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-3 py-2 text-left font-medium">Dirección</th>
                  <th className="px-3 py-2 text-left font-medium">NIF</th>
                  <th className="px-3 py-2 text-right font-medium">Base</th>
                  <th className="px-3 py-2 text-right font-medium">Ret. %</th>
                  <th className="px-3 py-2 text-right font-medium">Retención</th>
                </tr>
              </thead>
              <tbody>
                {resultado.desglose.map((d, i) => (
                  <tr key={i} className="border-b last:border-0">
                    <td className="px-3 py-2">{d.direccion}</td>
                    <td className="px-3 py-2 text-muted-foreground">{d.nifArrendatario}</td>
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
            <Home className="h-4 w-4" aria-hidden="true" />
            Introduce al menos un inmueble con renta para calcular las retenciones.
          </p>
        )}

        <p className="text-xs text-muted-foreground">
          Modelo 115 orientativo. Tipo de retención general: 19% sobre rentas de arrendamiento de inmuebles urbanos.
          Presentación: 1-20 del mes siguiente al trimestre.
        </p>
      </CardContent>
    </Card>
    </div>
  )
}
