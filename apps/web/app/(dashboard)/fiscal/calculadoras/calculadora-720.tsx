'use client'

import { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { eur, parseEuros } from './types'
import { LabelConAyuda } from './label-con-ayuda'
import { GUIA_MODELO_720 } from '@/lib/fiscal/guia-fiscal'
import { calcularModelo720, PAISES_COMUNES } from '@mantigestor/utils'
import type { BienExtranjero } from '@mantigestor/utils'

export function CalculadoraModelo720() {
  const [bienes, setBienes] = useState<BienExtranjero[]>([])
  const [tipo, setTipo] = useState<BienExtranjero['tipo']>('cuentas')
  const [pais, setPais] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [valor, setValor] = useState('')

  const resultado = useMemo(() => calcularModelo720({ bienes }), [bienes])

  const addBien = () => {
    if (!pais || !valor) return
    const v = parseEuros(valor)
    if (v === null) return
    setBienes(prev => [...prev, {
      id: crypto.randomUUID(),
      tipo,
      pais,
      descripcion,
      valor: v,
    }])
    setDescripcion('')
    setValor('')
  }

  const removeBien = (id: string) => setBienes(prev => prev.filter(b => b.id !== id))

  const TIPOS_BIEN = [
    { valor: 'cuentas', label: 'Cuentas financieras' },
    { valor: 'valores', label: 'Valores / participaciones' },
    { valor: 'inmuebles', label: 'Bienes inmuebles' },
    { valor: 'otros', label: 'Otros bienes' },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle>Modelo 720 — Bienes en el extranjero</CardTitle>
        <CardDescription>
          Declaración informativa obligatoria si el valor total supera 50.000€
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <LabelConAyuda htmlFor="tipoBien" ayuda={GUIA_MODELO_720.tipoBien}>Tipo de bien</LabelConAyuda>
            <select id="tipoBien" value={tipo} onChange={e => setTipo(e.target.value as BienExtranjero['tipo'])}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
              {TIPOS_BIEN.map(t => <option key={t.valor} value={t.valor}>{t.label}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <LabelConAyuda htmlFor="pais" ayuda={GUIA_MODELO_720.pais}>País</LabelConAyuda>
            <select id="pais" value={pais} onChange={e => setPais(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
              <option value="">Seleccionar...</option>
              {PAISES_COMUNES.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <Label>Descripción</Label>
            <Input value={descripcion} onChange={e => setDescripcion(e.target.value)} placeholder="Ej: Cuenta bancaria, piso..." />
          </div>
          <div className="space-y-2">
            <LabelConAyuda htmlFor="valor" ayuda={GUIA_MODELO_720.valor}>Valor (€)</LabelConAyuda>
            <Input id="valor" type="number" step="0.01" value={valor} onChange={e => setValor(e.target.value)} placeholder="0.00" />
          </div>
        </div>

        <Button variant="outline" onClick={addBien} disabled={!pais || !valor}>
          Añadir bien
        </Button>

        {bienes.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Bienes declarados</h4>
            <div className="space-y-2">
              {bienes.map(b => (
                <div key={b.id} className="flex items-center justify-between rounded-lg border p-3 text-sm">
                  <div>
                    <span className="font-medium">{b.pais}</span>
                    <span className="text-muted-foreground ml-2">
                      {TIPOS_BIEN.find(t => t.valor === b.tipo)?.label}
                    </span>
                    {b.descripcion && <span className="text-muted-foreground ml-2">— {b.descripcion}</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{eur(b.valor)}</span>
                    <Button variant="ghost" size="sm" onClick={() => removeBien(b.id)}>✕</Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <dl className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border p-3">
            <dt className="text-xs text-muted-foreground">Cuentas</dt>
            <dd className="font-semibold">{eur(resultado.totalCuentas)}</dd>
          </div>
          <div className="rounded-lg border p-3">
            <dt className="text-xs text-muted-foreground">Valores</dt>
            <dd className="font-semibold">{eur(resultado.totalValores)}</dd>
          </div>
          <div className="rounded-lg border p-3">
            <dt className="text-xs text-muted-foreground">Inmuebles</dt>
            <dd className="font-semibold">{eur(resultado.totalInmuebles)}</dd>
          </div>
          <div className="rounded-lg border p-3">
            <dt className="text-xs text-muted-foreground">Otros</dt>
            <dd className="font-semibold">{eur(resultado.totalOtros)}</dd>
          </div>
          <div className={`rounded-lg border p-3 sm:col-span-2 ${resultado.obligatorio ? 'border-red-500/50 bg-red-500/5' : 'border-green-500/50 bg-green-500/5'}`}>
            <dt className="text-xs text-muted-foreground">Valor total</dt>
            <dd className={`text-lg font-bold ${resultado.obligatorio ? 'text-red-600' : 'text-green-600'}`}>
              {eur(resultado.valorTotal)}
            </dd>
            <p className="text-xs text-muted-foreground mt-1">{resultado.resumen}</p>
          </div>
        </dl>

        {Object.keys(resultado.porPais).length > 0 && (
          <div>
            <h4 className="font-medium text-sm mb-2">Por país</h4>
            <div className="space-y-1">
              {Object.entries(resultado.porPais).map(([pais, valor]) => (
                <div key={pais} className="flex justify-between text-sm">
                  <span>{pais}</span>
                  <span className="font-medium">{eur(valor)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
