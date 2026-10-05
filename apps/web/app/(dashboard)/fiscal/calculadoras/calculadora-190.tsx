'use client'

import { useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Download, Plus, Trash2, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { calcularModelo190, type RendimientoRetencion190 } from '@mantigestor/utils'
import { BotonPDF } from '@/components/boton-pdf'
import { usePersonaActiva } from '@/contexts/persona-activa-context'

const TIPOS = [
  { value: 'trabajo', label: 'Trabajo (asalariado)' },
  { value: 'profesional', label: 'Actividad profesional' },
  { value: 'arrendamiento', label: 'Alquiler inmueble urbano' },
  { value: 'otros', label: 'Otros rendimientos' },
] as const

const formatMoney = (cents: number) =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(cents / 100)

interface Props {
  taxYear: number
}

export function Calculadora190({ taxYear }: Props) {
  const [rendimientos, setRendimientos] = useState<RendimientoRetencion190[]>([])
  const [_loading, _setLoading] = useState(false)
  const [cargandoNominas, setCargandoNominas] = useState(false)
  const { perfilActivoId } = usePersonaActiva()

  // New entry form
  const [nuevoTipo, setNuevoTipo] = useState<RendimientoRetencion190['tipo']>('trabajo')
  const [nuevaDescripcion, setNuevaDescripcion] = useState('')
  const [nuevoNif, setNuevoNif] = useState('')
  const [nuevoBruto, setNuevoBruto] = useState('')
  const [nuevoTipoRetencion, setNuevoTipoRetencion] = useState('15')

  const getSupabase = useCallback(() => createClient(), [])

  // Load from nóminas
  const cargarNominas = useCallback(async () => {
    setCargandoNominas(true)
    try {
      const supabase = getSupabase()
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

      const { data: nominasEmp } = await supabase
        .from('nominas')
        .select('empleada, salarioBruto, irpf')
        .eq('perfilId', perfilId)
        .eq('rol', 'empleado')
        .eq('anyo', taxYear)

      if (nominasEmp && nominasEmp.length > 0) {
        const porEmpleada = new Map<string, { bruto: number; retenciones: number }>()
        for (const n of nominasEmp) {
          const key = n.empleada || 'Empleador'
          const existente = porEmpleada.get(key) ?? { bruto: 0, retenciones: 0 }
          existente.bruto += n.salarioBruto
          existente.retenciones += Math.round(n.salarioBruto * (n.irpf / 100))
          porEmpleada.set(key, existente)
        }

        const nuevosRendimientos: RendimientoRetencion190[] = []
        for (const [empleada, datos] of porEmpleada) {
          nuevosRendimientos.push({
            tipo: 'trabajo',
            descripcion: empleada,
            nifPagador: '',
            brutoCents: datos.bruto,
            tipoRetencionPct: datos.bruto > 0 ? Math.round((datos.retenciones / datos.bruto) * 10000) / 100 : 0,
            retencionCents: datos.retenciones,
          })
        }
        setRendimientos(prev => [...prev, ...nuevosRendimientos])
      }
    } catch {
      // silently fail
    }
    setCargandoNominas(false)
  }, [getSupabase, taxYear, perfilActivoId])

  const agregar = () => {
    if (!nuevaDescripcion || !nuevoBruto) return
    const brutoEuros = parseFloat(nuevoBruto)
    if (isNaN(brutoEuros) || brutoEuros <= 0) return
    const brutoCents = Math.round(brutoEuros * 100)
    const pct = parseFloat(nuevoTipoRetencion)
    const retCents = Math.round(brutoCents * (pct / 100))

    setRendimientos(prev => [...prev, {
      tipo: nuevoTipo,
      descripcion: nuevaDescripcion,
      nifPagador: nuevoNif,
      brutoCents,
      tipoRetencionPct: pct,
      retencionCents: retCents,
    }])
    setNuevaDescripcion('')
    setNuevoNif('')
    setNuevoBruto('')
  }

  const eliminar = (idx: number) => {
    setRendimientos(prev => prev.filter((_, i) => i !== idx))
  }

  const resultado = calcularModelo190(rendimientos)

  const exportarCsv = () => {
    const filas: string[][] = [
      ['Tipo', 'Pagador', 'NIF', 'Bruto', 'Retención %', 'Retención €'],
      ...rendimientos.map(r => [
        r.tipo,
        r.descripcion,
        r.nifPagador,
        formatMoney(r.brutoCents),
        `${r.tipoRetencionPct}%`,
        formatMoney(r.retencionCents),
      ]),
      [],
      ['RESUMEN ANUAL'],
      ['Total bruto', formatMoney(resultado.totalBruto)],
      ['Total retenciones', formatMoney(resultado.totalRetenciones)],
      ['Total pagadores', String(resultado.totalPagadores)],
    ]
    const csv = '\uFEFF' + filas.map(f => f.map(c => `"${c}"`).join(';')).join('\r\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `modelo-190-${taxYear}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div id="pdf-modelo-190" className="space-y-3">
      <BotonPDF elementId="pdf-modelo-190" filename="modelo-190" />
      <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Modelo 190 — Retenciones anuales {taxYear}</CardTitle>
            <CardDescription>
              Resumen anual de todas las retenciones. Presentación: enero del año siguiente.
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button type="button" size="sm" variant="outline" onClick={() => void cargarNominas()} disabled={cargandoNominas}>
              <Loader2 className={`mr-1 h-3 w-3 ${cargandoNominas ? 'animate-spin' : ''}`} aria-hidden="true" />
              {cargandoNominas ? 'Cargando...' : 'Cargar nóminas'}
            </Button>
            {rendimientos.length > 0 && (
              <Button type="button" size="sm" variant="outline" onClick={exportarCsv}>
                <Download className="mr-1 h-3 w-3" aria-hidden="true" />
                CSV
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary */}
        {rendimientos.length > 0 && (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Total bruto</p>
              <p className="text-lg font-bold">{formatMoney(resultado.totalBruto)}</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Total retenciones</p>
              <p className="text-lg font-bold text-red-600">{formatMoney(resultado.totalRetenciones)}</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Pagadores</p>
              <p className="text-lg font-bold">{resultado.totalPagadores}</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Neto recibido</p>
              <p className="text-lg font-bold text-green-600">{formatMoney(resultado.totalBruto - resultado.totalRetenciones)}</p>
            </div>
          </div>
        )}

        {/* Breakdown table */}
        {rendimientos.length > 0 && (
          <div className="rounded-lg border overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-3 py-2 text-left font-medium">Tipo</th>
                  <th className="px-3 py-2 text-left font-medium">Pagador</th>
                  <th className="px-3 py-2 text-right font-medium">Bruto</th>
                  <th className="px-3 py-2 text-right font-medium">Retención</th>
                  <th className="px-3 py-2 text-right font-medium">Neto</th>
                  <th className="px-3 py-2 text-right font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {rendimientos.map((r, i) => (
                  <tr key={i} className="border-b last:border-0">
                    <td className="px-3 py-2 capitalize">{r.tipo}</td>
                    <td className="px-3 py-2">{r.descripcion}</td>
                    <td className="px-3 py-2 text-right">{formatMoney(r.brutoCents)}</td>
                    <td className="px-3 py-2 text-right text-red-600">
                      {formatMoney(r.retencionCents)} ({r.tipoRetencionPct}%)
                    </td>
                    <td className="px-3 py-2 text-right font-medium">
                      {formatMoney(r.brutoCents - r.retencionCents)}
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

        {/* Add entry form */}
        <div className="rounded-lg border p-4 space-y-3">
          <p className="text-sm font-medium">Añadir rendimiento</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-1">
              <Label>Tipo</Label>
              <select value={nuevoTipo} onChange={e => setNuevoTipo(e.target.value as RendimientoRetencion190['tipo'])}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm">
                {TIPOS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <Label>Pagador / concepto</Label>
              <Input value={nuevaDescripcion} onChange={e => setNuevaDescripcion(e.target.value)} placeholder="Nombre del pagador" />
            </div>
            <div className="space-y-1">
              <Label>NIF pagador</Label>
              <Input value={nuevoNif} onChange={e => setNuevoNif(e.target.value)} placeholder="B12345678" />
            </div>
            <div className="space-y-1">
              <Label>Bruto anual (€)</Label>
              <Input type="number" step="0.01" value={nuevoBruto} onChange={e => setNuevoBruto(e.target.value)} placeholder="25000" />
            </div>
            <div className="space-y-1">
              <Label>Retención (%)</Label>
              <Input type="number" step="0.01" value={nuevoTipoRetencion} onChange={e => setNuevoTipoRetencion(e.target.value)} placeholder="15" />
            </div>
            <div className="flex items-end">
              <Button type="button" size="sm" onClick={agregar} disabled={!nuevaDescripcion || !nuevoBruto}>
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
