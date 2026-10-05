'use client'

import { useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Trash2, Plus, Database } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { calcularModelo111, TIPOS_RETENCION_HABITUALES, type RendimientoRetencion } from '@mantigestor/utils'
import { LabelConAyuda } from './label-con-ayuda'
import { GUIA_MODELO_111 } from '@/lib/fiscal/guia-fiscal'
import { BotonPDF } from '@/components/boton-pdf'

const formatMoney = (cents: number) =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(cents / 100)

const TIPO_LABELS: Record<string, string> = {
  trabajo: 'Trabajo (empleados)',
  profesional: 'Profesionales',
  arrendamiento: 'Arrendamiento',
  otros: 'Otros',
}

interface Props {
  taxYear: number
}

export function Calculadora111({ taxYear }: Props) {
  const [trimestre, setTrimestre] = useState<1 | 2 | 3 | 4>(1)
  const [rendimientos, setRendimientos] = useState<RendimientoRetencion[]>([])
  const [pagosAnteriores, _setPagosAnteriores] = useState(0)
  const [cargando, setCargando] = useState(false)

  // Form state for adding new entry
  const [formTipo, setFormTipo] = useState<'trabajo' | 'profesional' | 'arrendamiento' | 'agricola' | 'otros'>('trabajo')
  const [formDesc, setFormDesc] = useState('')
  const [formBruto, setFormBruto] = useState('')
  const [formTipoRet, setFormTipoRet] = useState(String(TIPOS_RETENCION_HABITUALES.trabajoGeneral))

  const cargarDatosReales = useCallback(async () => {
    setCargando(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: perfil } = await supabase
        .from('perfiles')
        .select('id')
        .eq('userId', user.id)
        .single()
      if (!perfil) return
      const perfilId = perfil.id

      const desde = `${taxYear}-01-01`
      const hasta = `${taxYear + 1}-01-01`

      // Fetch nominas jefe (el usuario es empleador → retenciones que practica)
      const { data: nominasJefe } = await supabase
        .from('nominas')
        .select('empleada, salarioBruto, irpf, mes')
        .eq('perfilId', perfilId)
        .eq('rol', 'jefe')
        .eq('anyo', taxYear)

      // Fetch facturas gasto con retención (profesionales)
      const { data: facturas } = await supabase
        .from('facturas')
        .select('emisorReceptor, baseImponible, iva, total')
        .eq('perfilId', perfilId)
        .eq('tipo', 'gasto')
        .gte('fechaEmision', desde)
        .lt('fechaEmision', hasta)

      const nuevosRendimientos: RendimientoRetencion[] = []

      // Add nominas as trabajo retainings
      if (nominasJefe) {
        const porEmpleado = new Map<string, { bruto: number; retencion: number }>()
        for (const n of nominasJefe as unknown as Array<{ empleada: string; salarioBruto: number; irpf: number; mes: number }>) {
          // Filter by trimestre
          const trimestreNomina = Math.min(4, Math.ceil(n.mes / 3)) as 1 | 2 | 3 | 4
          if (trimestreNomina !== trimestre) continue

          const existing = porEmpleado.get(n.empleada) ?? { bruto: 0, retencion: 0 }
          existing.bruto += n.salarioBruto
          existing.retencion += Math.round(n.salarioBruto * (n.irpf / 100))
          porEmpleado.set(n.empleada, existing)
        }
        for (const [nombre, datos] of porEmpleado) {
          nuevosRendimientos.push({
            tipo: 'trabajo',
            descripcion: nombre,
            brutoCents: datos.bruto,
            tipoRetencionPct: datos.bruto > 0 ? Math.round((datos.retencion / datos.bruto) * 10000) / 100 : 0,
            retencionCents: datos.retencion,
          })
        }
      }

      // Add facturas gasto as professional retainings (15% retention)
      if (facturas) {
        const porProfesional = new Map<string, { bruto: number }>()
        for (const f of facturas as unknown as Array<{ emisorReceptor: string; baseImponible: number; iva: number; total: number }>) {
          const existing = porProfesional.get(f.emisorReceptor) ?? { bruto: 0 }
          existing.bruto += f.baseImponible
          porProfesional.set(f.emisorReceptor, existing)
        }
        for (const [nombre, datos] of porProfesional) {
          const RETENCION_PROFESIONAL = 15
          nuevosRendimientos.push({
            tipo: 'profesional',
            descripcion: nombre,
            brutoCents: datos.bruto,
            tipoRetencionPct: RETENCION_PROFESIONAL,
            retencionCents: Math.round(datos.bruto * (RETENCION_PROFESIONAL / 100)),
          })
        }
      }

      setRendimientos(prev => {
        const existentes = prev.filter(r => r.tipo !== 'trabajo' && r.tipo !== 'profesional')
        return [...existentes, ...nuevosRendimientos]
      })
    } catch {
      // silently fail
    } finally {
      setCargando(false)
    }
  }, [taxYear, trimestre])

  const addRendimiento = () => {
    if (!formDesc || !formBruto) return
    const bruto = Math.round(parseFloat(formBruto) * 100)
    const tipoRet = parseFloat(formTipoRet)
    setRendimientos(prev => [...prev, {
      tipo: formTipo,
      descripcion: formDesc,
      brutoCents: bruto,
      tipoRetencionPct: tipoRet,
      retencionCents: Math.round(bruto * (tipoRet / 100)),
    }])
    setFormDesc('')
    setFormBruto('')
  }

  const removeRendimiento = (idx: number) => {
    setRendimientos(prev => prev.filter((_, i) => i !== idx))
  }

  const resultado = calcularModelo111(
    rendimientos,
    pagosAnteriores
  )

  return (
    <div id="pdf-modelo-111" className="space-y-3">
      <BotonPDF elementId="pdf-modelo-111" filename="modelo-111" />
      <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Modelo 111 — Retenciones {taxYear}</CardTitle>
            <CardDescription>
              Declaración trimestral de retenciones e ingresos a cuenta del IRPF sobre rendimientos del
              trabajo, actividades profesionales, agrícolas y ganaderas y premios.
              Si eres empleador o pagas a profesionales o al sector primario, debes practicar retenciones.
            </CardDescription>
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => void cargarDatosReales()}
            disabled={cargando}
          >
            <Database className="mr-1 h-3 w-3" aria-hidden="true" />
            {cargando ? 'Cargando...' : 'Cargar datos'}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Trimestre selector */}
        <div className="flex gap-2">
          {([1, 2, 3, 4] as const).map(t => (
            <Button
              key={t}
              type="button"
              size="sm"
              variant={trimestre === t ? 'secondary' : 'outline'}
              onClick={() => setTrimestre(t)}
            >
              {t}º Trim
            </Button>
          ))}
        </div>

        {/* Add entry form */}
        <div className="grid gap-3 sm:grid-cols-[1fr_2fr_1fr_1fr_auto] items-end">
          <div className="space-y-1">
            <Label>Tipo</Label>
            <select
              value={formTipo}
              onChange={e => {
                const t = e.target.value as typeof formTipo
                setFormTipo(t)
                const defaults: Record<string, number> = {
                  trabajo: TIPOS_RETENCION_HABITUALES.trabajoGeneral,
                  profesional: TIPOS_RETENCION_HABITUALES.profesionalGeneral,
                  arrendamiento: TIPOS_RETENCION_HABITUALES.arrendamientoUrbano,
                  agricola: TIPOS_RETENCION_HABITUALES.agricolaGanadera,
                  otros: TIPOS_RETENCION_HABITUALES.premios,
                }
                setFormTipoRet(String(defaults[t] ?? 15))
              }}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
            >
              <option value="trabajo">Trabajo</option>
              <option value="profesional">Profesional</option>
              <option value="arrendamiento">Arrendamiento</option>
              <option value="agricola">Agrícola / Ganadera / Forestal</option>
              <option value="otros">Otros (premios, etc.)</option>
            </select>
          </div>
          <div className="space-y-1">
            <Label>Descripción / Pagador</Label>
            <Input
              value={formDesc}
              onChange={e => setFormDesc(e.target.value)}
              placeholder="Nombre del trabajador o profesional"
            />
          </div>
          <div className="space-y-1">
            <LabelConAyuda htmlFor="bruto-111" ayuda={GUIA_MODELO_111.baseRetencion}>Bruto satisfecho (€)</LabelConAyuda>
            <Input
              id="bruto-111"
              type="number"
              min="0"
              step="0.01"
              value={formBruto}
              onChange={e => setFormBruto(e.target.value)}
              placeholder="1500.00"
            />
          </div>
          <div className="space-y-1">
            <Label>Retención (%)</Label>
            <Input
              type="number"
              min="0"
              max="50"
              step="0.1"
              value={formTipoRet}
              onChange={e => setFormTipoRet(e.target.value)}
            />
          </div>
          <Button type="button" size="sm" onClick={addRendimiento} disabled={!formDesc || !formBruto}>
            <Plus className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>

        {/* Entries table */}
        {rendimientos.length > 0 && (
          <div className="rounded-lg border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-3 py-2 text-left font-medium">Tipo</th>
                  <th className="px-3 py-2 text-left font-medium">Descripción</th>
                  <th className="px-3 py-2 text-right font-medium">Bruto</th>
                  <th className="px-3 py-2 text-right font-medium">Ret. %</th>
                  <th className="px-3 py-2 text-right font-medium">Retención</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {rendimientos.map((r, i) => (
                  <tr key={i} className="border-b last:border-0">
                    <td className="px-3 py-2">
                      <span className="text-xs font-medium text-muted-foreground">{TIPO_LABELS[r.tipo]}</span>
                    </td>
                    <td className="px-3 py-2">{r.descripcion}</td>
                    <td className="px-3 py-2 text-right">{formatMoney(r.brutoCents)}</td>
                    <td className="px-3 py-2 text-right">{r.tipoRetencionPct}%</td>
                    <td className="px-3 py-2 text-right font-medium">{formatMoney(r.retencionCents)}</td>
                    <td className="px-3 py-2 text-right">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeRendimiento(i)}
                        className="h-7 text-destructive"
                      >
                        <Trash2 className="h-3 w-3" aria-hidden="true" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Summary */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {resultado.trabajoRetenciones > 0 && (
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Trabajo</p>
              <p className="text-lg font-semibold">{formatMoney(resultado.trabajoBruto)}</p>
              <p className="text-xs text-muted-foreground">Ret.: {formatMoney(resultado.trabajoRetenciones)}</p>
            </div>
          )}
          {resultado.profesionalRetenciones > 0 && (
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Profesionales</p>
              <p className="text-lg font-semibold">{formatMoney(resultado.profesionalBruto)}</p>
              <p className="text-xs text-muted-foreground">Ret.: {formatMoney(resultado.profesionalRetenciones)}</p>
            </div>
          )}
          {resultado.arrendamientoRetenciones > 0 && (
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Arrendamiento</p>
              <p className="text-lg font-semibold">{formatMoney(resultado.arrendamientoBruto)}</p>
              <p className="text-xs text-muted-foreground">Ret.: {formatMoney(resultado.arrendamientoRetenciones)}</p>
            </div>
          )}
          <div className="rounded-lg border border-primary/50 bg-primary/5 p-3">
            <p className="text-xs text-muted-foreground">Total a ingresar</p>
            <p className="text-lg font-bold text-primary">{formatMoney(resultado.totalRetenciones)}</p>
            <p className="text-xs text-muted-foreground">
              {resultado.aIngresar > 0 ? `A ingresar: ${formatMoney(resultado.aIngresar)}` : 'Sin pagos previos'}
            </p>
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          Modelo 111 orientativo. Los rendimientos de trabajo se cargan de las nóminas donde eres el jefe.
          Los profesionales se cargan de facturas de gasto. Presentación: 1-20 del mes siguiente al trimestre.
        </p>
      </CardContent>
    </Card>
    </div>
  )
}
