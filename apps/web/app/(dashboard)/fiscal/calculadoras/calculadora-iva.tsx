'use client'

import { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { calcularIva, extraerBaseDeTotal, type PorcentajeIva } from '@mantigestor/utils'
import { eur, parseEuros, type DatosFiscales } from './types'

export function CalculadoraIva({ datos }: { datos: DatosFiscales }) {
  const [tipoSel, setTipoSel] = useState<string>('')
  const [modo, setModo] = useState<'base' | 'total'>('base')
  const [importe, setImporte] = useState('')

  const tiposDisponibles = useMemo(
    () => [...new Set(datos.reglasIva.map(r => r.tipo))],
    [datos.reglasIva]
  )

  const tipoActual = tipoSel || tiposDisponibles[0] || ''
  const regla = datos.reglasIva.find(r => r.tipo === tipoActual)
  const ratePct = regla?.ratePct ?? 21
  const redondeado = Math.round(ratePct)
  const pctIva = ([0, 4, 10, 21].includes(redondeado) ? redondeado : 21) as PorcentajeIva

  const desglose = useMemo(() => {
    const cantidad = parseEuros(importe)
    if (cantidad === null) return null
    const centimos = Math.round(cantidad * 100)
    try {
      return modo === 'base' ? calcularIva(centimos, pctIva) : extraerBaseDeTotal(centimos, pctIva)
    } catch {
      return null
    }
  }, [importe, modo, pctIva])

  return (
    <Card>
      <CardHeader>
        <CardTitle>IVA {datos.taxYear}</CardTitle>
        <CardDescription>Tipos vigentes en territorio común y cálculo con desglose.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {tiposDisponibles.map(t => (
            <Button
              key={t}
              type="button"
              variant={t === tipoActual ? 'secondary' : 'outline'}
              size="sm"
              onClick={() => setTipoSel(t)}
            >
              {t} ({datos.reglasIva.find(r => r.tipo === t)?.ratePct.toLocaleString('es-ES')}%)
            </Button>
          ))}
        </div>

        <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
          <div className="space-y-2">
            <Label htmlFor="importe-iva">{modo === 'base' ? 'Base imponible (€)' : 'Total con IVA incluido (€)'}</Label>
            <Input
              id="importe-iva"
              type="number"
              min="0"
              step="0.01"
              placeholder="1000"
              value={importe}
              onChange={e => setImporte(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Button type="button" variant={modo === 'base' ? 'secondary' : 'outline'} size="sm" onClick={() => setModo('base')}>
              Añadir IVA
            </Button>
            <Button type="button" variant={modo === 'total' ? 'secondary' : 'outline'} size="sm" onClick={() => setModo('total')}>
              Extraer IVA
            </Button>
          </div>
        </div>

        {desglose && (
          <dl className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border p-3">
              <dt className="text-xs text-muted-foreground">Base</dt>
              <dd className="text-lg font-semibold">{eur(desglose.base)}</dd>
            </div>
            <div className="rounded-lg border p-3">
              <dt className="text-xs text-muted-foreground">Cuota IVA ({pctIva}%)</dt>
              <dd className="text-lg font-semibold">{eur(desglose.importeIva)}</dd>
            </div>
            <div className="rounded-lg border border-primary/50 bg-primary/5 p-3">
              <dt className="text-xs text-muted-foreground">Total</dt>
              <dd className="text-lg font-bold text-primary">{eur(desglose.importeTotal)}</dd>
            </div>
          </dl>
        )}

        {regla && (
          <div className="rounded-md border p-3 text-sm space-y-1">
            {regla.productCategory && (
              <p><span className="text-muted-foreground">Categoría:</span> {regla.productCategory}</p>
            )}
            {regla.ejemplos && (
              <p><span className="text-muted-foreground">Ejemplos:</span> {regla.ejemplos}</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
