'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, Trash2 } from 'lucide-react'
import { calcularModelo189, etiquetaTipoRenta, type RentaExenta189, type TipoRenta189 } from '@mantigestor/utils'
import { eur, parseEuros } from './types'
import { BotonPDF } from '@/components/boton-pdf'
import { GUIA_MODELO_189 } from '@/lib/fiscal/guia-fiscal'
import { LabelConAyuda } from './label-con-ayuda'
import { SELECT_CLS } from '@/lib/ui-constants'

const TIPOS_RENTA: TipoRenta189[] = ['beca', 'seguro_vida', 'invalidez', 'pension', 'ayuda_publica', 'otra']

interface Props {
  taxYear: number
}

export function Calculadora189({ taxYear }: Props) {
  const [rentas, setRentas] = useState<RentaExenta189[]>([])

  const [nuevoBeneficiario, setNuevoBeneficiario] = useState('')
  const [nuevoNif, setNuevoNif] = useState('')
  const [nuevoTipo, setNuevoTipo] = useState<TipoRenta189>('beca')
  const [nuevoImporte, setNuevoImporte] = useState('')
  const [nuevaDescripcion, setNuevaDescripcion] = useState('')

  const agregar = () => {
    const importeEuros = parseEuros(nuevoImporte)
    if (!nuevoBeneficiario || importeEuros === null) return

    setRentas(prev => [...prev, {
      beneficiario: nuevoBeneficiario,
      nif: nuevoNif,
      tipoRenta: nuevoTipo,
      importeCents: Math.round(importeEuros * 100),
      descripcion: nuevaDescripcion,
    }])
    setNuevoBeneficiario('')
    setNuevoNif('')
    setNuevoImporte('')
    setNuevaDescripcion('')
  }

  const eliminar = (idx: number) => {
    setRentas(prev => prev.filter((_, i) => i !== idx))
  }

  const resultado = calcularModelo189(rentas)

  return (
    <div id="pdf-modelo-189" className="space-y-3">
      <BotonPDF elementId="pdf-modelo-189" filename="modelo-189" />
      <Card>
        <CardHeader>
          <CardTitle>Modelo 189 — Valores, seguros y rentas {taxYear}</CardTitle>
          <CardDescription>
            Declaración informativa de rentas exentas del IRPF satisfechas por Administraciones Públicas y otros obligados.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {rentas.length > 0 && (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Total rentas exentas</p>
                <p className="text-lg font-bold">{eur(resultado.totalRentasExentasCents)}</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Beneficiarios</p>
                <p className="text-lg font-bold">{resultado.numBeneficiarios}</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Rentas</p>
                <p className="text-lg font-bold">{resultado.numRentas}</p>
              </div>
            </div>
          )}

          {resultado.desglosePorTipo.length > 0 && (
            <div className="rounded-lg border overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-3 py-2 text-left font-medium">Tipo de renta</th>
                    <th className="px-3 py-2 text-right font-medium">Beneficiarios</th>
                    <th className="px-3 py-2 text-right font-medium">Rentas</th>
                    <th className="px-3 py-2 text-right font-medium">Total importe</th>
                  </tr>
                </thead>
                <tbody>
                  {resultado.desglosePorTipo.map((d, i) => (
                    <tr key={i} className="border-b last:border-0">
                      <td className="px-3 py-2">{etiquetaTipoRenta(d.tipoRenta)}</td>
                      <td className="px-3 py-2 text-right">{d.numBeneficiarios}</td>
                      <td className="px-3 py-2 text-right">{d.numRentas}</td>
                      <td className="px-3 py-2 text-right">{eur(d.totalImporteCents)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {rentas.length > 0 && (
            <div className="rounded-lg border overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-3 py-2 text-left font-medium">Beneficiario</th>
                    <th className="px-3 py-2 text-left font-medium">NIF</th>
                    <th className="px-3 py-2 text-left font-medium">Tipo</th>
                    <th className="px-3 py-2 text-left font-medium">Descripción</th>
                    <th className="px-3 py-2 text-right font-medium">Importe</th>
                    <th className="px-3 py-2 text-right font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {rentas.map((r, i) => (
                    <tr key={i} className="border-b last:border-0">
                      <td className="px-3 py-2">{r.beneficiario}</td>
                      <td className="px-3 py-2">{r.nif}</td>
                      <td className="px-3 py-2">{etiquetaTipoRenta(r.tipoRenta)}</td>
                      <td className="px-3 py-2">{r.descripcion}</td>
                      <td className="px-3 py-2 text-right">{eur(r.importeCents)}</td>
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
            <p className="text-sm font-medium">Añadir renta exenta</p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-1">
                <LabelConAyuda htmlFor="m189-beneficiario" ayuda={GUIA_MODELO_189.beneficiario}>Nombre del beneficiario</LabelConAyuda>
                <Input id="m189-beneficiario" value={nuevoBeneficiario} onChange={e => setNuevoBeneficiario(e.target.value)} placeholder="Juan García" />
              </div>
              <div className="space-y-1">
                <LabelConAyuda htmlFor="m189-nif" ayuda={GUIA_MODELO_189.nif}>NIF del beneficiario</LabelConAyuda>
                <Input id="m189-nif" value={nuevoNif} onChange={e => setNuevoNif(e.target.value)} placeholder="12345678Z" />
              </div>
              <div className="space-y-1">
                <LabelConAyuda htmlFor="m189-tipo" ayuda={GUIA_MODELO_189.tipoRenta}>Tipo de renta exenta</LabelConAyuda>
                <select
                  id="m189-tipo"
                  className={SELECT_CLS}
                  value={nuevoTipo}
                  onChange={e => setNuevoTipo(e.target.value as TipoRenta189)}
                >
                  {TIPOS_RENTA.map(t => <option key={t} value={t}>{etiquetaTipoRenta(t)}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <LabelConAyuda htmlFor="m189-importe" ayuda={GUIA_MODELO_189.importe}>Importe renta exenta (€)</LabelConAyuda>
                <Input id="m189-importe" type="number" step="0.01" value={nuevoImporte} onChange={e => setNuevoImporte(e.target.value)} placeholder="6000" />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <LabelConAyuda htmlFor="m189-descripcion" ayuda={GUIA_MODELO_189.descripcion}>Descripción</LabelConAyuda>
                <Input id="m189-descripcion" value={nuevaDescripcion} onChange={e => setNuevaDescripcion(e.target.value)} placeholder="Beca de estudios universitarios" />
              </div>
              <div className="flex items-end">
                <Button type="button" size="sm" onClick={agregar} disabled={!nuevoBeneficiario || !nuevoImporte}>
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
