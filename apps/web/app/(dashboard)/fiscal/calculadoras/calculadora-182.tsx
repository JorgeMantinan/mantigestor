'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, Trash2 } from 'lucide-react'
import { calcularModelo182, type Donacion182 } from '@mantigestor/utils'
import { eur, parseEuros } from './types'
import { BotonPDF } from '@/components/boton-pdf'
import { GUIA_MODELO_182 } from '@/lib/fiscal/guia-fiscal'
import { LabelConAyuda } from './label-con-ayuda'
import { COMUNIDADES } from '@/lib/fiscal/constantes'
import { SELECT_CLS } from '@/lib/ui-constants'

interface Props {
  taxYear: number
}

export function Calculadora182({ taxYear }: Props) {
  const [donaciones, setDonaciones] = useState<Donacion182[]>([])

  const [nuevoDonante, setNuevoDonante] = useState('')
  const [nuevoNif, setNuevoNif] = useState('')
  const [nuevaCcaa, setNuevaCcaa] = useState(COMUNIDADES[0] ?? '')
  const [nuevoImporte, setNuevoImporte] = useState('')
  const [nuevaDeduccion, setNuevaDeduccion] = useState('')

  const agregar = () => {
    const importeEuros = parseEuros(nuevoImporte)
    const deduccionEuros = parseEuros(nuevaDeduccion)
    if (!nuevoDonante || importeEuros === null) return

    setDonaciones(prev => [...prev, {
      donante: nuevoDonante,
      nifDonante: nuevoNif,
      ccaaDonante: nuevaCcaa,
      importeDonacionesCents: Math.round(importeEuros * 100),
      importeDeduccionCents: Math.round((deduccionEuros ?? 0) * 100),
    }])
    setNuevoDonante('')
    setNuevoNif('')
    setNuevoImporte('')
    setNuevaDeduccion('')
  }

  const eliminar = (idx: number) => {
    setDonaciones(prev => prev.filter((_, i) => i !== idx))
  }

  const resultado = calcularModelo182(donaciones)

  return (
    <div id="pdf-modelo-182" className="space-y-3">
      <BotonPDF elementId="pdf-modelo-182" filename="modelo-182" />
      <Card>
        <CardHeader>
          <CardTitle>Modelo 182 — Donaciones {taxYear}</CardTitle>
          <CardDescription>
            Declaración informativa de donaciones que generan derecho a deducción en IRPF.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {donaciones.length > 0 && (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Total donaciones</p>
                <p className="text-lg font-bold">{eur(resultado.totalDonacionesCents)}</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Total deducciones</p>
                <p className="text-lg font-bold text-green-600">{eur(resultado.totalDeduccionesCents)}</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Donantes</p>
                <p className="text-lg font-bold">{resultado.numDonantes}</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Donaciones</p>
                <p className="text-lg font-bold">{resultado.numDonaciones}</p>
              </div>
            </div>
          )}

          {resultado.desglosePorCCAA.length > 0 && (
            <div className="rounded-lg border overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-3 py-2 text-left font-medium">CCAA</th>
                    <th className="px-3 py-2 text-right font-medium">Donaciones</th>
                    <th className="px-3 py-2 text-right font-medium">Total importe</th>
                    <th className="px-3 py-2 text-right font-medium">Total deducción</th>
                  </tr>
                </thead>
                <tbody>
                  {resultado.desglosePorCCAA.map((d, i) => (
                    <tr key={i} className="border-b last:border-0">
                      <td className="px-3 py-2">{d.ccaa}</td>
                      <td className="px-3 py-2 text-right">{d.numDonaciones}</td>
                      <td className="px-3 py-2 text-right">{eur(d.totalImporteCents)}</td>
                      <td className="px-3 py-2 text-right text-green-600">{eur(d.totalDeduccionCents)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {donaciones.length > 0 && (
            <div className="rounded-lg border overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-3 py-2 text-left font-medium">Donante</th>
                    <th className="px-3 py-2 text-left font-medium">NIF</th>
                    <th className="px-3 py-2 text-left font-medium">CCAA</th>
                    <th className="px-3 py-2 text-right font-medium">Importe</th>
                    <th className="px-3 py-2 text-right font-medium">Deducción</th>
                    <th className="px-3 py-2 text-right font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {donaciones.map((d, i) => (
                    <tr key={i} className="border-b last:border-0">
                      <td className="px-3 py-2">{d.donante}</td>
                      <td className="px-3 py-2">{d.nifDonante}</td>
                      <td className="px-3 py-2">{d.ccaaDonante}</td>
                      <td className="px-3 py-2 text-right">{eur(d.importeDonacionesCents)}</td>
                      <td className="px-3 py-2 text-right text-green-600">{eur(d.importeDeduccionCents)}</td>
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
          )}

          <div className="rounded-lg border p-4 space-y-3">
            <p className="text-sm font-medium">Añadir donación</p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-1">
                <LabelConAyuda htmlFor="m182-donante" ayuda={GUIA_MODELO_182.donante}>Nombre del donante</LabelConAyuda>
                <Input id="m182-donante" value={nuevoDonante} onChange={e => setNuevoDonante(e.target.value)} placeholder="Fundación Española del Corazón" />
              </div>
              <div className="space-y-1">
                <LabelConAyuda htmlFor="m182-nif" ayuda={GUIA_MODELO_182.nifDonante}>NIF del donante</LabelConAyuda>
                <Input id="m182-nif" value={nuevoNif} onChange={e => setNuevoNif(e.target.value)} placeholder="A12345678" />
              </div>
              <div className="space-y-1">
                <LabelConAyuda htmlFor="m182-ccaa" ayuda={GUIA_MODELO_182.ccaaDonante}>CCAA del donante</LabelConAyuda>
                <select
                  id="m182-ccaa"
                  className={SELECT_CLS}
                  value={nuevaCcaa}
                  onChange={e => setNuevaCcaa(e.target.value)}
                >
                  {COMUNIDADES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <LabelConAyuda htmlFor="m182-importe" ayuda={GUIA_MODELO_182.importeDonaciones}>Importe donación (€)</LabelConAyuda>
                <Input id="m182-importe" type="number" step="0.01" value={nuevoImporte} onChange={e => setNuevoImporte(e.target.value)} placeholder="200" />
              </div>
              <div className="space-y-1">
                <LabelConAyuda htmlFor="m182-deduccion">Deducción aplicable (€)</LabelConAyuda>
                <Input id="m182-deduccion" type="number" step="0.01" value={nuevaDeduccion} onChange={e => setNuevaDeduccion(e.target.value)} placeholder="50" />
              </div>
              <div className="flex items-end">
                <Button type="button" size="sm" onClick={agregar} disabled={!nuevoDonante || !nuevoImporte}>
                  <Plus className="mr-1 h-3 w-3" />
                  Añadir
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
