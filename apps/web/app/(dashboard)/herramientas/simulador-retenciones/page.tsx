'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Calculator } from 'lucide-react'

const TIPOS_CONTRATO = [
  { id: 'general', label: 'General', retencion: 19 },
  { id: 'renda', label: 'Rendimientos capital inmobiliario', retencion: 19 },
  { id: 'actividades', label: 'Actividades económicas', retencion: 21 },
  { id: 'profesionales', label: 'Profesionales', retencion: 15 },
  { id: 'arrendamiento', label: 'Arrendamiento local negocio', retencion: 19 },
] as const

const TRAMOS_IRPF_2026 = [
  { min: 0, max: 12450, tipo: 19 },
  { min: 12450, max: 20200, tipo: 24 },
  { min: 20200, max: 35200, tipo: 30 },
  { min: 35200, max: 60000, tipo: 37 },
  { min: 60000, max: 300000, tipo: 45 },
  { min: 300000, max: Infinity, tipo: 47 },
]

export default function SimuladorRetencionesPage() {
  const [brutoAnual, setBrutoAnual] = useState<number>(30000)
  const [tipoContrato, setTipoContrato] = useState('profesionales')
  const [seguridadSocial, setSeguridadSocial] = useState<number>(2965.20)
  const [reduccionIRPF, setReduccionIRPF] = useState<number>(2000)

  const resultado = useMemo(() => {
    const brutoMensual = brutoAnual / 12
    const tipoRetencion = TIPOS_CONTRATO.find(t => t.id === tipoContrato)?.retencion ?? 19

    // Base para retención: bruto anual - cuota SS trabajador (50% - 2965.20 en 2026)
    const baseRetencion = Math.max(0, brutoAnual - seguridadSocial - reduccionIRPF)
    const retencionAnual = Math.round(baseRetencion * (tipoRetencion / 100))
    const retencionMensual = retencionAnual / 12

    // Cálculo IRPF real por tramos
    const baseImponible = Math.max(0, brutoAnual - seguridadSocial - reduccionIRPF)
    let irpfTramos = 0
    let restante = baseImponible
    for (const tramo of TRAMOS_IRPF_2026) {
      const tramoBase = Math.min(restante, tramo.max - tramo.min)
      if (tramoBase <= 0) break
      irpfTramos += Math.round(tramoBase * (tramo.tipo / 100))
      restante -= tramoBase
    }

    const netoAnual = brutoAnual - retencionAnual - seguridadSocial
    const netoMensual = netoAnual / 12
    const cuotaSSMensual = seguridadSocial / 12
    const costeEmpresa = brutoAnual + Math.round(brutoAnual * 0.299) // 29.9% SS empresa

    return {
      brutoMensual: brutoMensual / 100,
      retencionAnual: retencionAnual / 100,
      retencionMensual: retencionMensual / 100,
      tipoRetencion,
      irpfTramos: irpfTramos / 100,
      baseRetencion: baseRetencion / 100,
      netoAnual: netoAnual / 100,
      netoMensual: netoMensual / 100,
      cuotaSSMensual: cuotaSSMensual / 100,
      seguridadSocial: seguridadSocial / 100,
      reduccionIRPF: reduccionIRPF / 100,
      costeEmpresa: costeEmpresa / 100,
    }
  }, [brutoAnual, tipoContrato, seguridadSocial, reduccionIRPF])

  const formatEuro = (v: number) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(v)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Simulador de retenciones</h1>
        <p className="text-muted-foreground">Calcula tu salario neto, retenciones y coste para la empresa</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Calculator className="h-4 w-4" /> Datos de entrada
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Salario bruto anual (€)</Label>
              <Input type="number" value={brutoAnual / 100} onChange={(e) => setBrutoAnual(Math.round(parseFloat(e.target.value || '0') * 100))} />
            </div>
            <div className="space-y-2">
              <Label>Tipo de retención</Label>
              <select value={tipoContrato} onChange={(e) => setTipoContrato(e.target.value)}
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
                {TIPOS_CONTRATO.map(t => (
                  <option key={t.id} value={t.id}>{t.label} ({t.retencion}%)</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Cuota SS trabajador anual (€)</Label>
              <Input type="number" step="0.01" value={seguridadSocial / 100} onChange={(e) => setSeguridadSocial(Math.round(parseFloat(e.target.value || '0') * 100))} />
            </div>
            <div className="space-y-2">
              <Label>Reducción IRPF (€)</Label>
              <Input type="number" step="0.01" value={reduccionIRPF / 100} onChange={(e) => setReduccionIRPF(Math.round(parseFloat(e.target.value || '0') * 100))} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Resultado</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-sm text-muted-foreground">Bruto anual</span>
                <span className="text-sm font-bold">{formatEuro(resultado.brutoMensual * 12)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-sm text-muted-foreground">Base retención</span>
                <span className="text-sm">{formatEuro(resultado.baseRetencion)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-sm text-muted-foreground">IRPF ({resultado.tipoRetencion}%)</span>
                <span className="text-sm text-red-600">-{formatEuro(resultado.retencionAnual)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-sm text-muted-foreground">Seguridad Social</span>
                <span className="text-sm text-red-600">-{formatEuro(resultado.seguridadSocial)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b bg-muted/50 -mx-3 px-3 rounded">
                <span className="text-sm font-bold">Neto anual</span>
                <span className="text-lg font-bold text-green-600">{formatEuro(resultado.netoAnual)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-sm text-muted-foreground">Neto mensual</span>
                <span className="text-lg font-bold text-green-600">{formatEuro(resultado.netoMensual)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-sm text-muted-foreground">IRPF retención mensual</span>
                <span className="text-sm">{formatEuro(resultado.retencionMensual)}</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-muted-foreground">Coste total empresa</span>
                <span className="text-sm font-medium">{formatEuro(resultado.costeEmpresa)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
