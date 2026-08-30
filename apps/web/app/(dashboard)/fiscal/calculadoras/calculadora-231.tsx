'use client'

import { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Plus, Trash2 } from 'lucide-react'
import { eur, parseEuros } from './types'
import { LabelConAyuda } from './label-con-ayuda'
import { GUIA_MODELO_231 } from '@/lib/fiscal/guia-fiscal'
import { calcularModelo231, TIPOS_OPERACION_CRYPTO } from '@mantigestor/utils'
import type { OperacionCrypto, TipoOperacionCrypto } from '@mantigestor/utils'
import { SELECT_CLS } from '@/lib/ui-constants'
import { BotonPDF } from '@/components/boton-pdf'

interface Props {
  taxYear: number
}

export function Calculadora231({ taxYear }: Props) {
  const [operaciones, setOperaciones] = useState<OperacionCrypto[]>([])

  const [fecha, setFecha] = useState('')
  const [tipo, setTipo] = useState<TipoOperacionCrypto>('compra')
  const [criptomoneda, setCriptomoneda] = useState('')
  const [unidades, setUnidades] = useState('')
  const [valor, setValor] = useState('')
  const [walletOrigen, setWalletOrigen] = useState('')
  const [walletDestino, setWalletDestino] = useState('')

  const resultado = useMemo(() =>
    calcularModelo231({ ejercicio: taxYear, nif: '', denominacion: '', operaciones }),
    [taxYear, operaciones])

  const agregar = () => {
    const valorEur = parseEuros(valor)
    const unidadesNum = parseFloat(unidades)
    if (!fecha || !criptomoneda || isNaN(unidadesNum) || unidadesNum <= 0 || valorEur === null) return

    setOperaciones(prev => [...prev, {
      fecha,
      tipoOperacion: tipo,
      criptomoneda,
      cantidadUnidades: unidadesNum,
      valorEurCents: Math.round(valorEur * 100),
      walletOrigen,
      walletDestino,
    }])
    setFecha('')
    setCriptomoneda('')
    setUnidades('')
    setValor('')
    setWalletOrigen('')
    setWalletDestino('')
  }

  const eliminar = (idx: number) =>
    setOperaciones(prev => prev.filter((_, i) => i !== idx))

  return (
    <div id="pdf-modelo-231" className="space-y-3">
      <BotonPDF elementId="pdf-modelo-231" filename="modelo-231" />
      <Card>
      <CardHeader>
        <CardTitle>Modelo 231 — Criptomonedas {taxYear}</CardTitle>
        <CardDescription>
          Declaración informativa de operaciones con criptomonedas. Obligatorio si el volumen total ≥ 50.000€.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {operaciones.length > 0 && (
          <>
            <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-lg border p-3">
                <dt className="text-xs text-muted-foreground">Nº operaciones</dt>
                <dd className="text-lg font-bold">{resultado.numOperaciones}</dd>
              </div>
              <div className="rounded-lg border p-3">
                <dt className="text-xs text-muted-foreground">Volumen total</dt>
                <dd className="text-lg font-bold">{eur(resultado.volumenTotalCents)}</dd>
              </div>
              <div className="rounded-lg border p-3">
                <dt className="text-xs text-muted-foreground">Ganancias/pérdidas</dt>
                <dd className={`text-lg font-bold ${resultado.totalGananciaPerdidaCents >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {eur(resultado.totalGananciaPerdidaCents)}
                </dd>
              </div>
              <div className={`rounded-lg border p-3 ${resultado.obligatorio ? 'border-red-500/50 bg-red-500/5' : 'border-green-500/50 bg-green-500/5'}`}>
                <dt className="text-xs text-muted-foreground">Estado</dt>
                <dd className={`text-sm font-bold ${resultado.obligatorio ? 'text-red-600' : 'text-green-600'}`}>
                  {resultado.obligatorio ? 'Obligatorio presentar' : 'No obligatorio'}
                </dd>
              </div>
            </dl>

            {resultado.resumenPorTipo.length > 0 && (
              <div className="rounded-lg border overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="px-3 py-2 text-left font-medium">Tipo operación</th>
                      <th className="px-3 py-2 text-right font-medium">Nº ops</th>
                      <th className="px-3 py-2 text-right font-medium">Volumen</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resultado.resumenPorTipo.map(r => (
                      <tr key={r.tipoOperacion} className="border-b last:border-0">
                        <td className="px-3 py-2 font-medium capitalize">{r.tipoOperacion}</td>
                        <td className="px-3 py-2 text-right">{r.numOperaciones}</td>
                        <td className="px-3 py-2 text-right">{eur(r.volumenTotalCents)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="rounded-lg border overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-3 py-2 text-left font-medium">Fecha</th>
                    <th className="px-3 py-2 text-left font-medium">Tipo</th>
                    <th className="px-3 py-2 text-left font-medium">Crypto</th>
                    <th className="px-3 py-2 text-right font-medium">Unidades</th>
                    <th className="px-3 py-2 text-right font-medium">Valor €</th>
                    <th className="px-3 py-2 text-right font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {operaciones.map((op, i) => (
                    <tr key={i} className="border-b last:border-0">
                      <td className="px-3 py-2">{op.fecha}</td>
                      <td className="px-3 py-2 capitalize">{op.tipoOperacion}</td>
                      <td className="px-3 py-2 font-medium">{op.criptomoneda}</td>
                      <td className="px-3 py-2 text-right">{op.cantidadUnidades}</td>
                      <td className="px-3 py-2 text-right">{eur(op.valorEurCents)}</td>
                      <td className="px-3 py-2 text-right">
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => eliminar(i)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {resultado.gananciasPerdidas.length > 0 && (
              <div className="rounded-lg border p-3 space-y-1">
                <p className="text-sm font-medium">Ganancias/pérdidas por criptomoneda</p>
                {resultado.gananciasPerdidas.map(g => (
                  <div key={g.criptomoneda} className="flex justify-between text-sm">
                    <span>{g.criptomoneda}</span>
                    <span className={g.gananciaPerdidaCents >= 0 ? 'text-green-600' : 'text-red-600'}>
                      {eur(g.gananciaPerdidaCents)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        <div className="rounded-lg border p-4 space-y-3">
          <p className="text-sm font-medium">Añadir operación</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-1">
              <LabelConAyuda htmlFor="m231-fecha" ayuda={GUIA_MODELO_231.fecha}>Fecha</LabelConAyuda>
              <Input id="m231-fecha" type="date" value={fecha} onChange={e => setFecha(e.target.value)} />
            </div>
            <div className="space-y-1">
              <LabelConAyuda htmlFor="m231-tipo" ayuda={GUIA_MODELO_231.tipoOperacion}>Tipo de operación</LabelConAyuda>
              <select id="m231-tipo" value={tipo} onChange={e => setTipo(e.target.value as TipoOperacionCrypto)}
                className={SELECT_CLS}>
                {TIPOS_OPERACION_CRYPTO.map(t => <option key={t.valor} value={t.valor}>{t.label}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <LabelConAyuda htmlFor="m231-crypto" ayuda={GUIA_MODELO_231.criptomoneda}>Criptomoneda</LabelConAyuda>
              <Input id="m231-crypto" value={criptomoneda} onChange={e => setCriptomoneda(e.target.value)} placeholder="BTC, ETH, SOL..." />
            </div>
            <div className="space-y-1">
              <LabelConAyuda htmlFor="m231-unidades" ayuda={GUIA_MODELO_231.unidades}>Unidades</LabelConAyuda>
              <Input id="m231-unidades" type="number" step="any" value={unidades} onChange={e => setUnidades(e.target.value)} placeholder="0.00" />
            </div>
            <div className="space-y-1">
              <LabelConAyuda htmlFor="m231-valor" ayuda={GUIA_MODELO_231.valorEur}>Valor (€)</LabelConAyuda>
              <Input id="m231-valor" type="number" step="0.01" value={valor} onChange={e => setValor(e.target.value)} placeholder="0.00" />
            </div>
            <div className="space-y-1">
              <LabelConAyuda htmlFor="m231-wallet-origen" ayuda={GUIA_MODELO_231.wallets}>Wallet origen</LabelConAyuda>
              <Input id="m231-wallet-origen" value={walletOrigen} onChange={e => setWalletOrigen(e.target.value)} placeholder="0x..." />
            </div>
            <div className="space-y-1">
              <Label>Wallet destino</Label>
              <Input value={walletDestino} onChange={e => setWalletDestino(e.target.value)} placeholder="0x..." />
            </div>
            <div className="flex items-end">
              <Button type="button" size="sm" onClick={agregar} disabled={!fecha || !criptomoneda || !unidades || !valor}>
                <Plus className="mr-1 h-3 w-3" />
                Añadir
              </Button>
            </div>
          </div>
        </div>

        {resultado.observaciones.length > 0 && (
          <div className="space-y-1">
            {resultado.observaciones.map((obs, i) => (
              <p key={i} className="text-xs text-muted-foreground">• {obs}</p>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
    </div>
  )
}
