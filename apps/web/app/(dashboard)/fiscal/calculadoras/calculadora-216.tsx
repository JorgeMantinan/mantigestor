'use client'

import { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Plus, Trash2 } from 'lucide-react'
import { eur, parseEuros } from './types'
import { LabelConAyuda } from './label-con-ayuda'
import { GUIA_MODELO_216 } from '@/lib/fiscal/guia-fiscal'
import { calcularModelo216, TIPOS_RETENCION_216 } from '@mantigestor/utils'
import type { RetencionNoResidente216 } from '@mantigestor/utils'
import { SELECT_CLS } from '@/lib/ui-constants'
import { BotonPDF } from '@/components/boton-pdf'

interface Props {
  taxYear: number
}

export function Calculadora216({ taxYear }: Props) {
  const [retenciones, setRetenciones] = useState<RetencionNoResidente216[]>([])
  const [trimestre, setTrimestre] = useState<1 | 2 | 3 | 4>(1)

  const [nif, setNif] = useState('')
  const [nombre, setNombre] = useState('')
  const [pais, setPais] = useState('')
  const [rentas, setRentas] = useState('')
  const [tipoRetencion, setTipoRetencion] = useState('24')

  const resultado = useMemo(() =>
    calcularModelo216({ trimestre, ejercicio: taxYear, retenciones }),
    [trimestre, taxYear, retenciones])

  const agregar = () => {
    const rentasEur = parseEuros(rentas)
    if (!nif || !nombre || !pais || rentasEur === null) return
    const rentasCents = Math.round(rentasEur * 100)
    const pct = parseFloat(tipoRetencion) || 24
    const retCents = Math.round(rentasCents * (pct / 100))

    setRetenciones(prev => [...prev, {
      nifBeneficiario: nif,
      nombreBeneficiario: nombre,
      paisResidencia: pais,
      rentasCents,
      tipoRetencionPct: pct,
      retencionPracticadaCents: retCents,
    }])
    setNif('')
    setNombre('')
    setPais('')
    setRentas('')
  }

  const eliminar = (idx: number) =>
    setRetenciones(prev => prev.filter((_, i) => i !== idx))

  return (
    <div id="pdf-modelo-216" className="space-y-3">
      <BotonPDF elementId="pdf-modelo-216" filename="modelo-216" />
      <Card>
      <CardHeader>
        <CardTitle>Modelo 216 — Retenciones no residentes {taxYear}</CardTitle>
        <CardDescription>
          Declaración trimestral de retenciones sobre rendimientos del trabajo a no residentes.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="max-w-xs space-y-2">
          <Label>Trimestre</Label>
          <select value={trimestre} onChange={e => setTrimestre(Number(e.target.value) as 1 | 2 | 3 | 4)}
            className={SELECT_CLS}>
            {[1, 2, 3, 4].map(t => <option key={t} value={t}>T{t}</option>)}
          </select>
        </div>

        {retenciones.length > 0 && (
          <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border p-3">
              <dt className="text-xs text-muted-foreground">Total rentas</dt>
              <dd className="text-lg font-bold">{eur(resultado.totalRentas)}</dd>
            </div>
            <div className="rounded-lg border p-3">
              <dt className="text-xs text-muted-foreground">Total retenciones</dt>
              <dd className="text-lg font-bold text-red-600">{eur(resultado.totalRetenciones)}</dd>
            </div>
            <div className="rounded-lg border p-3">
              <dt className="text-xs text-muted-foreground">Perceptores</dt>
              <dd className="text-lg font-semibold">{resultado.numBeneficiarios}</dd>
            </div>
            <div className="rounded-lg border p-3">
              <dt className="text-xs text-muted-foreground">Países</dt>
              <dd className="text-lg font-semibold">{resultado.paisesRepresentados}</dd>
            </div>
          </dl>
        )}

        {retenciones.length > 0 && (
          <div className="rounded-lg border overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-3 py-2 text-left font-medium">NIF</th>
                  <th className="px-3 py-2 text-left font-medium">Nombre</th>
                  <th className="px-3 py-2 text-left font-medium">País</th>
                  <th className="px-3 py-2 text-right font-medium">Rentas</th>
                  <th className="px-3 py-2 text-right font-medium">Tipo</th>
                  <th className="px-3 py-2 text-right font-medium">Retención</th>
                  <th className="px-3 py-2 text-right font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {retenciones.map((r, i) => (
                  <tr key={i} className="border-b last:border-0">
                    <td className="px-3 py-2">{r.nifBeneficiario}</td>
                    <td className="px-3 py-2">{r.nombreBeneficiario}</td>
                    <td className="px-3 py-2">{r.paisResidencia}</td>
                    <td className="px-3 py-2 text-right">{eur(r.rentasCents)}</td>
                    <td className="px-3 py-2 text-right">{r.tipoRetencionPct}%</td>
                    <td className="px-3 py-2 text-right text-red-600">{eur(r.retencionPracticadaCents)}</td>
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
          <p className="text-sm font-medium">Añadir perceptor</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-1">
              <LabelConAyuda htmlFor="m216-nif" ayuda={GUIA_MODELO_216.nifBeneficiario}>NIF</LabelConAyuda>
              <Input id="m216-nif" value={nif} onChange={e => setNif(e.target.value)} placeholder="B12345678" />
            </div>
            <div className="space-y-1">
              <LabelConAyuda htmlFor="m216-nombre" ayuda={GUIA_MODELO_216.nombreBeneficiario}>Nombre</LabelConAyuda>
              <Input id="m216-nombre" value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Nombre o razón social" />
            </div>
            <div className="space-y-1">
              <LabelConAyuda htmlFor="m216-pais" ayuda={GUIA_MODELO_216.paisResidencia}>País de residencia</LabelConAyuda>
              <Input id="m216-pais" value={pais} onChange={e => setPais(e.target.value)} placeholder="Alemania" />
            </div>
            <div className="space-y-1">
              <LabelConAyuda htmlFor="m216-rentas" ayuda={GUIA_MODELO_216.rentasPercibidas}>Rentas percibidas (€)</LabelConAyuda>
              <Input id="m216-rentas" type="number" step="0.01" value={rentas} onChange={e => setRentas(e.target.value)} placeholder="0.00" />
            </div>
            <div className="space-y-1">
              <LabelConAyuda htmlFor="m216-tipo" ayuda={GUIA_MODELO_216.tipoRetencion}>Tipo de retención (%)</LabelConAyuda>
              <select id="m216-tipo" value={tipoRetencion} onChange={e => setTipoRetencion(e.target.value)}
                className={SELECT_CLS}>
                {TIPOS_RETENCION_216.map(t => <option key={t.valor} value={t.valor}>{t.label}</option>)}
              </select>
            </div>
            <div className="flex items-end">
              <Button type="button" size="sm" onClick={agregar} disabled={!nif || !nombre || !pais || !rentas}>
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
