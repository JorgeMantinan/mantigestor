'use client'

import { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { eur, parseEuros } from './types'
import { LabelConAyuda } from './label-con-ayuda'
import { GUIA_MODELO_721 } from '@/lib/fiscal/guia-fiscal'
import { calcularModelo721 } from '@mantigestor/utils'
import type { ExchangeVirtual } from '@mantigestor/utils'
import { BotonPDF } from '@/components/boton-pdf'

export function CalculadoraModelo721() {
  const [exchanges, setExchanges] = useState<ExchangeVirtual[]>([])
  const [nombre, setNombre] = useState('')
  const [pais, setPais] = useState('')
  const [tipoMoneda, setTipoMoneda] = useState('')
  const [saldoFin, setSaldoFin] = useState('')
  const [valorMercado, setValorMercado] = useState('')
  const [operaciones, setOperaciones] = useState('')

  const resultado = useMemo(() => calcularModelo721({ exchanges }), [exchanges])

  const addExchange = () => {
    const saldo = parseEuros(saldoFin)
    const valor = parseEuros(valorMercado)
    if (!nombre || !pais || !tipoMoneda || valor === null) return

    setExchanges(prev => [...prev, {
      nombre,
      pais,
      tipoMoneda,
      saldoFin: saldo ?? 0,
      valorMercado: valor,
      operaciones: parseInt(operaciones) || 0,
    }])
    setNombre('')
    setPais('')
    setTipoMoneda('')
    setSaldoFin('')
    setValorMercado('')
    setOperaciones('')
  }

  const removeExchange = (idx: number) => {
    setExchanges(prev => prev.filter((_, i) => i !== idx))
  }

  return (
    <div id="pdf-modelo-721" className="space-y-3">
      <BotonPDF elementId="pdf-modelo-721" filename="modelo-721" />
      <Card>
      <CardHeader>
        <CardTitle>Modelo 721 — Monedas virtuales en el extranjero</CardTitle>
        <CardDescription>
          Declaración informativa obligatoria si el valor total supera los 50.000€
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <LabelConAyuda htmlFor="nombreExchange" ayuda={GUIA_MODELO_721.nombreExchange}>Nombre del exchange</LabelConAyuda>
            <Input id="nombreExchange" value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Binance, Coinbase..." />
          </div>
          <div className="space-y-2">
            <Label>País del exchange</Label>
            <Input value={pais} onChange={e => setPais(e.target.value)} placeholder="Islas Caimán, Seychelles..." />
          </div>
          <div className="space-y-2">
            <Label>Tipo de moneda</Label>
            <Input value={tipoMoneda} onChange={e => setTipoMoneda(e.target.value)} placeholder="BTC, ETH, USDT..." />
          </div>
          <div className="space-y-2">
            <LabelConAyuda htmlFor="saldoFinAno" ayuda={GUIA_MODELO_721.saldoFinAno}>Saldo a fin de año</LabelConAyuda>
            <Input id="saldoFinAno" type="number" step="0.01" value={saldoFin} onChange={e => setSaldoFin(e.target.value)} placeholder="0.00" />
          </div>
          <div className="space-y-2">
            <LabelConAyuda htmlFor="valorMercado" ayuda={GUIA_MODELO_721.valorMercado}>Valor de mercado (€)</LabelConAyuda>
            <Input id="valorMercado" type="number" step="0.01" value={valorMercado} onChange={e => setValorMercado(e.target.value)} placeholder="0.00" />
          </div>
          <div className="space-y-2">
            <Label>Nº de operaciones</Label>
            <Input type="number" value={operaciones} onChange={e => setOperaciones(e.target.value)} placeholder="0" />
          </div>
        </div>

        <Button variant="outline" onClick={addExchange} disabled={!nombre || !pais || !tipoMoneda}>
          Añadir exchange
        </Button>

        {exchanges.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Exchanges declarados</h4>
            <div className="space-y-2">
              {exchanges.map((ex, i) => (
                <div key={i} className="flex items-center justify-between rounded-lg border p-3 text-sm">
                  <div>
                    <span className="font-medium">{ex.nombre}</span>
                    <span className="text-muted-foreground ml-2">{ex.pais} · {ex.tipoMoneda}</span>
                    <span className="text-muted-foreground ml-2">— {ex.operaciones} ops</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{eur(ex.valorMercado)}</span>
                    <Button variant="ghost" size="sm" onClick={() => removeExchange(i)}>✕</Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <dl className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border p-3">
            <dt className="text-xs text-muted-foreground">Nº de exchanges</dt>
            <dd className="text-lg font-semibold">{exchanges.length}</dd>
          </div>
          <div className={`rounded-lg border p-3 ${resultado.obligatorio ? 'border-red-500/50 bg-red-500/5' : 'border-green-500/50 bg-green-500/5'}`}>
            <dt className="text-xs text-muted-foreground">Valor total</dt>
            <dd className={`text-lg font-bold ${resultado.obligatorio ? 'text-red-600' : 'text-green-600'}`}>
              {eur(resultado.valorTotal)}
            </dd>
          </div>
          <div className={`rounded-lg border p-3 sm:col-span-2 ${resultado.obligatorio ? 'border-red-500/50 bg-red-500/5' : 'border-green-500/50 bg-green-500/5'}`}>
            <dt className="text-xs text-muted-foreground">Resultado</dt>
            <dd className={`font-bold ${resultado.obligatorio ? 'text-red-600' : 'text-green-600'}`}>
              {resultado.resumen}
            </dd>
          </div>
        </dl>

        {resultado.porExchange.length > 0 && (
          <div>
            <h4 className="font-medium text-sm mb-2">Desglose por exchange</h4>
            <div className="space-y-1">
              {resultado.porExchange.map((ex, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span>{ex.nombre} ({ex.pais}) — {ex.tipoMoneda}</span>
                  <span className="font-medium">{eur(ex.valorMercado)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
    </div>
  )
}
