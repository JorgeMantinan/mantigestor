'use client'

import { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { eur, parseEuros } from './types'
import { calcularModelo347 } from '@mantigestor/utils'
import type { OperacionTercero } from '@mantigestor/utils'
import { LabelConAyuda } from './label-con-ayuda'
import { GUIA_MODELO_347 } from '@/lib/fiscal/guia-fiscal'

export function CalculadoraModelo347() {
  const [operaciones, setOperaciones] = useState<OperacionTercero[]>([])
  const [tercero, setTercero] = useState('')
  const [nif, setNif] = useState('')
  const [importeCompra, setImporteCompra] = useState('')
  const [importeVenta, setImporteVenta] = useState('')
  const [cantidadesPendientes, setCantidadesPendientes] = useState('')

  const resultado = useMemo(() => calcularModelo347({ operaciones }), [operaciones])

  const addOperacion = () => {
    const compra = parseEuros(importeCompra) ?? 0
    const venta = parseEuros(importeVenta) ?? 0
    if (!tercero || !nif || (compra === 0 && venta === 0)) return

    setOperaciones(prev => [...prev, {
      tercero,
      nif,
      importeTotal: compra + venta,
      importeCompra: compra,
      importeVenta: venta,
      operacionInmueble: false,
      operacionSeguros: false,
      cantidadesPendientes: parseEuros(cantidadesPendientes) ?? 0,
    }])
    setTercero('')
    setNif('')
    setImporteCompra('')
    setImporteVenta('')
    setCantidadesPendientes('')
  }

  const removeOperacion = (idx: number) => {
    setOperaciones(prev => prev.filter((_, i) => i !== idx))
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Modelo 347 — Operaciones con terceros</CardTitle>
        <CardDescription>
          Declaración informativa obligatoria si las operaciones con un tercero superan los 3.005,06€
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <LabelConAyuda htmlFor="m347-tercero" ayuda={GUIA_MODELO_347.tercero}>Tercero</LabelConAyuda>
            <Input id="m347-tercero" value={tercero} onChange={e => setTercero(e.target.value)} placeholder="Nombre o razón social" />
          </div>
          <div className="space-y-2">
            <Label>NIF</Label>
            <Input value={nif} onChange={e => setNif(e.target.value)} placeholder="B12345678" />
          </div>
          <div className="space-y-2">
            <Label>Importe compras (€)</Label>
            <Input type="number" step="0.01" value={importeCompra} onChange={e => setImporteCompra(e.target.value)} placeholder="0.00" />
          </div>
          <div className="space-y-2">
            <Label>Importe ventas (€)</Label>
            <Input type="number" step="0.01" value={importeVenta} onChange={e => setImporteVenta(e.target.value)} placeholder="0.00" />
          </div>
          <div className="space-y-2">
            <LabelConAyuda htmlFor="m347-pendientes" ayuda={GUIA_MODELO_347.importeTotal}>Cantidades pendientes (€)</LabelConAyuda>
            <Input id="m347-pendientes" type="number" step="0.01" value={cantidadesPendientes} onChange={e => setCantidadesPendientes(e.target.value)} placeholder="0.00" />
          </div>
        </div>

        <Button variant="outline" onClick={addOperacion} disabled={!tercero || !nif}>
          Añadir operación
        </Button>

        {operaciones.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Operaciones ({operaciones.length})</h4>
            <div className="space-y-2">
              {operaciones.map((op, i) => (
                <div key={i} className="flex items-center justify-between rounded-lg border p-3 text-sm">
                  <div>
                    <span className="font-medium">{op.tercero}</span>
                    <span className="text-muted-foreground ml-2">{op.nif}</span>
                    <span className="text-muted-foreground ml-2">
                      — Compra: {eur(op.importeCompra)} / Venta: {eur(op.importeVenta)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{eur(op.importeTotal)}</span>
                    <Button variant="ghost" size="sm" onClick={() => removeOperacion(i)}>✕</Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <dl className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border p-3">
            <dt className="text-xs text-muted-foreground">Terceros declarados</dt>
            <dd className="text-lg font-semibold">{operaciones.length}</dd>
          </div>
          <div className="rounded-lg border p-3">
            <dt className="text-xs text-muted-foreground">Terceros obligatorios (&gt;3.005,06€)</dt>
            <dd className="text-lg font-semibold">{resultado.numTerceros}</dd>
          </div>
          <div className="rounded-lg border p-3">
            <dt className="text-xs text-muted-foreground">Total compras</dt>
            <dd className="text-lg font-semibold">{eur(resultado.totalCompras)}</dd>
          </div>
          <div className="rounded-lg border p-3">
            <dt className="text-xs text-muted-foreground">Total ventas</dt>
            <dd className="text-lg font-semibold">{eur(resultado.totalVentas)}</dd>
          </div>
          <div className={`rounded-lg border p-3 sm:col-span-2 ${resultado.obligatorio ? 'border-red-500/50 bg-red-500/5' : 'border-green-500/50 bg-green-500/5'}`}>
            <dt className="text-xs text-muted-foreground">Resultado</dt>
            <dd className={`font-bold ${resultado.obligatorio ? 'text-red-600' : 'text-green-600'}`}>
              {resultado.resumen}
            </dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  )
}
