'use client'

import { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { eur, parseEuros, type DatosFiscales } from './types'
import type { TipoIs } from '@/lib/fiscal/datos'
import { LabelConAyuda } from './label-con-ayuda'
import { GUIA_IS } from '@/lib/fiscal/guia-fiscal'

export function CalculadoraIs({ datos }: { datos: DatosFiscales }) {
  const anios = useMemo(
    () => [...new Set(datos.tiposIs.map(t => t.taxYear))].sort((a, b) => b - a),
    [datos.tiposIs]
  )
  const [anioSel, setAnioSel] = useState<number>(anios[0] ?? 2026)
  const [entidadSel, setEntidadSel] = useState<string>('')
  const [base, setBase] = useState('')

  const tiposAnio = datos.tiposIs.filter(t => t.taxYear === anioSel)
  const tipo: TipoIs | undefined = tiposAnio.find(t => t.tipoEntidad === entidadSel) ?? tiposAnio[0]

  const cuota = useMemo(() => {
    const cantidad = parseEuros(base)
    if (cantidad === null || !tipo) return null
    return Math.round(cantidad * 100 * (tipo.tipoPct / 100))
  }, [base, tipo])

  const baseImponible = parseEuros(base)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Impuesto sobre Sociedades</CardTitle>
        <CardDescription>Cuota estimada según tipo de entidad y año.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {anios.map(a => (
            <button
              key={a}
              type="button"
              onClick={() => { setAnioSel(a); setEntidadSel('') }}
              className={`rounded-md px-3 py-1.5 text-sm border transition-colors ${
                a === anioSel ? 'bg-secondary text-secondary-foreground' : 'hover:bg-muted'
              }`}
            >
              {a}{datos.tiposIs.some(t => t.taxYear === a && t.previsto) ? ' (previsto)' : ''}
            </button>
          ))}
        </div>

        <div className="space-y-2 max-w-md">
          <LabelConAyuda htmlFor="entidad-is" ayuda={GUIA_IS.tipoEntidad!}>Tipo de entidad</LabelConAyuda>
          <select
            id="entidad-is"
            value={tipo?.tipoEntidad ?? ''}
            onChange={e => setEntidadSel(e.target.value)}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
          >
            {tiposAnio.map(t => (
              <option key={t.tipoEntidad} value={t.tipoEntidad}>{t.tipoEntidad}</option>
            ))}
          </select>
          {tipo?.requisitoFacturacion && (
            <p className="text-xs text-muted-foreground">Requisito: {tipo.requisitoFacturacion}</p>
          )}
        </div>

        <div className="max-w-xs space-y-2">
          <LabelConAyuda htmlFor="base-is" ayuda={GUIA_IS.baseIs!}>Base imponible (€)</LabelConAyuda>
          <Input
            id="base-is"
            type="number"
            min="0"
            step="0.01"
            placeholder="50000"
            value={base}
            onChange={e => setBase(e.target.value)}
          />
        </div>

        {cuota !== null && baseImponible !== null && tipo && (
          <dl className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border p-3">
              <dt className="text-xs text-muted-foreground">Tipo aplicado</dt>
              <dd className="text-lg font-semibold">{tipo.tipoPct.toLocaleString('es-ES')}%</dd>
            </div>
            <div className="rounded-lg border border-primary/50 bg-primary/5 p-3">
              <dt className="text-xs text-muted-foreground">Cuota íntegra estimada</dt>
              <dd className="text-lg font-bold text-primary">{eur(cuota)}</dd>
            </div>
          </dl>
        )}

        {tipo?.notas && (
          <p className="text-xs text-muted-foreground">{tipo.notas}</p>
        )}
      </CardContent>
    </Card>
  )
}
