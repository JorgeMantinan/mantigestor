'use client'

import { useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Download, Plus, Trash2, Database, Loader2 } from 'lucide-react'
import { calcularModelo180, type RendimientoArrendamiento180 } from '@mantigestor/utils'
import { BotonPDF } from '@/components/boton-pdf'
import { generar180Automatico } from '@/lib/fiscal/auto-180'
import { createClient } from '@/lib/supabase/client'
import { usePersonaActiva } from '@/contexts/persona-activa-context'

const formatMoney = (cents: number) =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(cents / 100)

interface Props {
  taxYear: number
}

export function Calculadora180({ taxYear }: Props) {
  const [arrendamientos, setArrendamientos] = useState<RendimientoArrendamiento180[]>([])
  const [cargando, setCargando] = useState(false)
  const { perfilActivoId } = usePersonaActiva()

  // New entry form
  const [nuevaDireccion, setNuevaDireccion] = useState('')
  const [nuevoNif, setNuevoNif] = useState('')
  const [nuevoNombre, setNuevoNombre] = useState('')
  const [nuevasRentas, setNuevasRentas] = useState('')
  const [nuevoTipoRetencion, setNuevoTipoRetencion] = useState('19')

  const cargarDatosReales = useCallback(async () => {
    setCargando(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      let perfilId = perfilActivoId || user.id
      if (perfilActivoId) {
        const { data: perfil } = await supabase.from('perfiles').select('id').eq('id', perfilActivoId).single()
        if (perfil) perfilId = perfil.id
      } else {
        const { data: perfil } = await supabase.from('perfiles').select('id').eq('userId', user.id).single()
        if (perfil) perfilId = perfil.id
      }

      const resultado = await generar180Automatico(perfilId, taxYear)
      if (!resultado) return
      setArrendamientos(resultado.arrendamientos)
    } catch {
      // silently fail
    } finally {
      setCargando(false)
    }
  }, [taxYear, perfilActivoId])

  const agregar = () => {
    if (!nuevaDireccion || !nuevasRentas) return
    const rentasEuros = parseFloat(nuevasRentas)
    if (isNaN(rentasEuros) || rentasEuros <= 0) return
    const rentasCents = Math.round(rentasEuros * 100)
    const pct = parseFloat(nuevoTipoRetencion)
    const retCents = Math.round(rentasCents * (pct / 100))

    setArrendamientos(prev => [...prev, {
      direccion: nuevaDireccion,
      nifInquilino: nuevoNif,
      nombreInquilino: nuevoNombre,
      rentasPercibidasCents: rentasCents,
      tipoRetencionPct: pct,
      retencionCents: retCents,
    }])
    setNuevaDireccion('')
    setNuevoNif('')
    setNuevoNombre('')
    setNuevasRentas('')
  }

  const eliminar = (idx: number) => {
    setArrendamientos(prev => prev.filter((_, i) => i !== idx))
  }

  const resultado = calcularModelo180(arrendamientos)

  const exportarCsv = () => {
    const filas: string[][] = [
      ['Inmueble', 'Inquilino', 'NIF', 'Rentas anuales', 'Retención %', 'Retención €'],
      ...arrendamientos.map(a => [
        a.direccion,
        a.nombreInquilino,
        a.nifInquilino,
        formatMoney(a.rentasPercibidasCents),
        `${a.tipoRetencionPct}%`,
        formatMoney(a.retencionCents),
      ]),
      [],
      ['RESUMEN ANUAL'],
      ['Total rentas', formatMoney(resultado.totalRentas)],
      ['Total retenciones', formatMoney(resultado.totalRetenciones)],
      ['Inquilinos', String(resultado.numInquilinos)],
      ['Inmuebles', String(resultado.numInmuebles)],
    ]
    const csv = '\uFEFF' + filas.map(f => f.map(c => `"${c}"`).join(';')).join('\r\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `modelo-180-${taxYear}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div id="pdf-modelo-180" className="space-y-3">
      <BotonPDF elementId="pdf-modelo-180" filename="modelo-180" />
      <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Modelo 180 — Retenciones alquiler anual {taxYear}</CardTitle>
            <CardDescription>
              Resumen anual de retenciones por arrendamiento de inmuebles urbanos. Presentación: enero.
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => void cargarDatosReales()}
              disabled={cargando}
            >
              {cargando ? (
                <Loader2 className="mr-1 h-3 w-3 animate-spin" aria-hidden="true" />
              ) : (
                <Database className="mr-1 h-3 w-3" aria-hidden="true" />
              )}
              {cargando ? 'Cargando...' : 'Cargar datos'}
            </Button>
            {arrendamientos.length > 0 && (
              <Button type="button" size="sm" variant="outline" onClick={exportarCsv}>
                <Download className="mr-1 h-3 w-3" aria-hidden="true" />
                CSV
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {arrendamientos.length > 0 && (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Total rentas anuales</p>
              <p className="text-lg font-bold">{formatMoney(resultado.totalRentas)}</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Total retenciones</p>
              <p className="text-lg font-bold text-red-600">{formatMoney(resultado.totalRetenciones)}</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Inquilinos</p>
              <p className="text-lg font-bold">{resultado.numInquilinos}</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Inmuebles</p>
              <p className="text-lg font-bold">{resultado.numInmuebles}</p>
            </div>
          </div>
        )}

        {arrendamientos.length > 0 && (
          <div className="rounded-lg border overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-3 py-2 text-left font-medium">Inmueble</th>
                  <th className="px-3 py-2 text-left font-medium">Inquilino</th>
                  <th className="px-3 py-2 text-right font-medium">Rentas</th>
                  <th className="px-3 py-2 text-right font-medium">Retención</th>
                  <th className="px-3 py-2 text-right font-medium">Neto</th>
                  <th className="px-3 py-2 text-right font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {arrendamientos.map((a, i) => (
                  <tr key={i} className="border-b last:border-0">
                    <td className="px-3 py-2">{a.direccion}</td>
                    <td className="px-3 py-2">{a.nombreInquilino}</td>
                    <td className="px-3 py-2 text-right">{formatMoney(a.rentasPercibidasCents)}</td>
                    <td className="px-3 py-2 text-right text-red-600">
                      {formatMoney(a.retencionCents)} ({a.tipoRetencionPct}%)
                    </td>
                    <td className="px-3 py-2 text-right font-medium">
                      {formatMoney(a.rentasPercibidasCents - a.retencionCents)}
                    </td>
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
          <p className="text-sm font-medium">Añadir inmueble</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-1">
              <Label>Dirección del inmueble</Label>
              <Input value={nuevaDireccion} onChange={e => setNuevaDireccion(e.target.value)} placeholder="Calle Mayor 1, 3°B" />
            </div>
            <div className="space-y-1">
              <Label>Nombre inquilino</Label>
              <Input value={nuevoNombre} onChange={e => setNuevoNombre(e.target.value)} placeholder="Juan García" />
            </div>
            <div className="space-y-1">
              <Label>NIF inquilino</Label>
              <Input value={nuevoNif} onChange={e => setNuevoNif(e.target.value)} placeholder="12345678Z" />
            </div>
            <div className="space-y-1">
              <Label>Rentas anuales percibidas (€)</Label>
              <Input type="number" step="0.01" value={nuevasRentas} onChange={e => setNuevasRentas(e.target.value)} placeholder="9600" />
            </div>
            <div className="space-y-1">
              <Label>Retención (%)</Label>
              <Input type="number" step="0.01" value={nuevoTipoRetencion} onChange={e => setNuevoTipoRetencion(e.target.value)} placeholder="19" />
              <p className="text-xs text-muted-foreground">19% residentes, 24% no residentes</p>
            </div>
            <div className="flex items-end">
              <Button type="button" size="sm" onClick={agregar} disabled={!nuevaDireccion || !nuevasRentas}>
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
