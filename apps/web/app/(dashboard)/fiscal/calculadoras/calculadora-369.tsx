'use client'

import { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { eur, parseEuros } from './types'
import { calcularModelo369, obtenerTipoIvaPais, PAISES_OSS } from '@mantigestor/utils'
import type { VentaOSS } from '@mantigestor/utils'
import { LabelConAyuda } from './label-con-ayuda'
import { GUIA_MODELO_369 } from '@/lib/fiscal/guia-fiscal'

const TRIMESTRES = [
  { value: '1', label: 'T1 (ene-mar)' },
  { value: '2', label: 'T2 (abr-jun)' },
  { value: '3', label: 'T3 (jul-sep)' },
  { value: '4', label: 'T4 (oct-dic)' },
] as const

export function CalculadoraModelo369({ taxYear }: { taxYear: number }) {
  const [trimestre, setTrimestre] = useState<1 | 2 | 3 | 4>(1)
  const [ventas, setVentas] = useState<VentaOSS[]>([])
  const [paisDestino, setPaisDestino] = useState(PAISES_OSS[0] ?? 'Alemania')
  const [baseImponible, setBaseImponible] = useState('')
  const [tipoIva, setTipoIva] = useState('')

  const resultado = useMemo(() => calcularModelo369({ ejercicio: taxYear, trimestre, ventas }), [taxYear, trimestre, ventas])

  const addVenta = () => {
    const base = parseEuros(baseImponible) ?? 0
    if (!paisDestino || base === 0) return

    const tipo = parseFloat(tipoIva) || obtenerTipoIvaPais(paisDestino)
    const cuota = Math.round(base * tipo / 100)

    setVentas(prev => [...prev, {
      paisDestino,
      baseImponible: base,
      tipoIva: tipo,
      cuotaIva: cuota,
    }])
    setBaseImponible('')
    setTipoIva('')
  }

  const removeVenta = (idx: number) => {
    setVentas(prev => prev.filter((_, i) => i !== idx))
  }

  const cambiarPais = (pais: string) => {
    setPaisDestino(pais)
    setTipoIva(String(obtenerTipoIvaPais(pais)))
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Modelo 369 — IVA OSS</CardTitle>
        <CardDescription>
          Declaración-liquidación del IVA en un solo estado miembro (OSS) para ventas a distancia intracomunitarias B2C
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Trimestre</Label>
            <select
              value={String(trimestre)}
              onChange={e => setTrimestre(Number(e.target.value) as 1 | 2 | 3 | 4)}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
            >
              {TRIMESTRES.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label>País destino</Label>
            <select
              value={paisDestino}
              onChange={e => cambiarPais(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
            >
              {PAISES_OSS.map(p => (
                <option key={p} value={p}>{p} ({obtenerTipoIvaPais(p)}%)</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <LabelConAyuda htmlFor="m369-base" ayuda={GUIA_MODELO_369.baseImponible}>Base imponible (€)</LabelConAyuda>
            <Input id="m369-base" type="number" step="0.01" value={baseImponible} onChange={e => setBaseImponible(e.target.value)} placeholder="0.00" />
          </div>
          <div className="space-y-2">
            <Label>IVA del país destino (%)</Label>
            <Input type="number" step="0.01" value={tipoIva} onChange={e => setTipoIva(e.target.value)} placeholder={String(obtenerTipoIvaPais(paisDestino))} />
          </div>
        </div>

        <Button variant="outline" onClick={addVenta} disabled={!paisDestino || !baseImponible}>
          Añadir venta
        </Button>

        {ventas.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Ventas ({ventas.length})</h4>
            <div className="space-y-2">
              {ventas.map((v, i) => (
                <div key={i} className="flex items-center justify-between rounded-lg border p-3 text-sm">
                  <div>
                    <span className="font-medium">{v.paisDestino}</span>
                    <span className="text-muted-foreground ml-2">
                      — Base: {eur(v.baseImponible)} @ {v.tipoIva}%
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{eur(v.cuotaIva)}</span>
                    <Button variant="ghost" size="sm" onClick={() => removeVenta(i)}>✕</Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <dl className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border p-3">
            <dt className="text-xs text-muted-foreground">Países destino</dt>
            <dd className="text-lg font-semibold">{resultado.numPaises}</dd>
          </div>
          <div className="rounded-lg border p-3">
            <dt className="text-xs text-muted-foreground">Base imponible total</dt>
            <dd className="text-lg font-semibold">{eur(resultado.totalBaseImponible)}</dd>
          </div>
          <div className="rounded-lg border p-3 sm:col-span-2">
            <dt className="text-xs text-muted-foreground">Cuota IVA a ingresar</dt>
            <dd className="text-lg font-semibold text-primary">{eur(resultado.totalCuotaIva)}</dd>
          </div>
          <div className="rounded-lg border p-3 sm:col-span-2">
            <dt className="text-xs text-muted-foreground">Resumen</dt>
            <dd className="font-bold">{resultado.resumen}</dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  )
}
