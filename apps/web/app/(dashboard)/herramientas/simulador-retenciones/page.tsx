'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Calculator } from 'lucide-react'
import { useLanguage } from '@/contexts/language-context'

const TIPOS_CONTRATO = [
  { id: 'general', labelEs: 'General', labelEn: 'General', retencion: 19 },
  { id: 'renda', labelEs: 'Rendimientos capital inmobiliario', labelEn: 'Real estate capital income', retencion: 19 },
  { id: 'actividades', labelEs: 'Actividades económicas', labelEn: 'Economic activities', retencion: 21 },
  { id: 'profesionales', labelEs: 'Profesionales', labelEn: 'Professionals', retencion: 15 },
  { id: 'arrendamiento', labelEs: 'Arrendamiento local negocio', labelEn: 'Business premises lease', retencion: 19 },
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
  const [brutoAnual, setBrutoAnual] = useState<number>(3000000) // céntimos (30.000 €)
  const [tipoContrato, setTipoContrato] = useState('profesionales')
  const { idioma, t } = useLanguage()

  // Calculados automáticamente (en céntimos) para que el usuario no tenga que conocerlos:
  // - Cuota SS del trabajador: 6,5 % del bruto (contingencias comunes, desempleo,
  //   formación y MEI en 2026).
  // - Gastos deducibles del trabajo: 2.000 € (art. 19.2.f LIRPF).
  const seguridadSocial = Math.round(brutoAnual * 0.065)
  const reduccionIRPF = 200000

  const resultado = useMemo(() => {
    const brutoMensual = brutoAnual / 12
    const tipoRetencion = TIPOS_CONTRATO.find(tipo => tipo.id === tipoContrato)?.retencion ?? 19

    const baseRetencion = Math.max(0, brutoAnual - seguridadSocial - reduccionIRPF)
    const retencionAnual = Math.round(baseRetencion * (tipoRetencion / 100))
    const retencionMensual = Math.round(retencionAnual / 12)

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
    const netoMensual = Math.round(netoAnual / 12)
    const cuotaSSMensual = Math.round(seguridadSocial / 12)
    const costeEmpresa = brutoAnual + Math.round(brutoAnual * 0.299) // 29.9% SS empresa

    return {
      brutoMensual: Math.round(brutoMensual / 100),
      retencionAnual: Math.round(retencionAnual / 100),
      retencionMensual: Math.round(retencionMensual / 100),
      tipoRetencion,
      irpfTramos: Math.round(irpfTramos / 100),
      baseRetencion: Math.round(baseRetencion / 100),
      netoAnual: Math.round(netoAnual / 100),
      netoMensual: Math.round(netoMensual / 100),
      cuotaSSMensual: Math.round(cuotaSSMensual / 100),
      seguridadSocial: Math.round(seguridadSocial / 100),
      reduccionIRPF: Math.round(reduccionIRPF / 100),
      costeEmpresa: Math.round(costeEmpresa / 100),
    }
  }, [brutoAnual, tipoContrato, seguridadSocial, reduccionIRPF])

  const formatEuro = (v: number) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(v)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t('simuladorRetenciones.titulo')}</h1>
        <p className="text-muted-foreground">{t('simuladorRetenciones.subtitulo')}</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Calculator className="h-4 w-4" /> {t('simuladorRetenciones.datosEntrada')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>{t('simuladorRetenciones.salarioBrutoAnual')}</Label>
              <Input type="number" value={brutoAnual / 100} onChange={(e) => setBrutoAnual(Math.round(parseFloat(e.target.value || '0') * 100))} />
            </div>
            <div className="space-y-2">
              <Label>{t('simuladorRetenciones.tipoRetencion')}</Label>
              <select value={tipoContrato} onChange={(e) => setTipoContrato(e.target.value)}
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
                {TIPOS_CONTRATO.map(tipo => (
                  <option key={tipo.id} value={tipo.id}>{idioma === 'en' ? tipo.labelEn : tipo.labelEs} ({tipo.retencion}%)</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>{t('simuladorRetenciones.cuotaSSTrabajador')}</Label>
              <div className="flex h-10 items-center rounded-md border bg-muted px-3 text-sm">
                {formatEuro(seguridadSocial / 100)}
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t('simuladorRetenciones.reduccionIRPF')}</Label>
              <div className="flex h-10 items-center rounded-md border bg-muted px-3 text-sm">
                {formatEuro(reduccionIRPF / 100)}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">{t('simuladorRetenciones.resultado')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-sm text-muted-foreground">{t('simuladorRetenciones.brutoAnual')}</span>
                <span className="text-sm font-bold">{formatEuro(resultado.brutoMensual * 12)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-sm text-muted-foreground">{t('simuladorRetenciones.baseRetencion')}</span>
                <span className="text-sm">{formatEuro(resultado.baseRetencion)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-sm text-muted-foreground">{t('simuladorRetenciones.irpf')} ({resultado.tipoRetencion}%)</span>
                <span className="text-sm text-red-600">-{formatEuro(resultado.retencionAnual)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-sm text-muted-foreground">{t('simuladorRetenciones.seguridadSocial')}</span>
                <span className="text-sm text-red-600">-{formatEuro(resultado.seguridadSocial)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b bg-muted/50 -mx-3 px-3 rounded">
                <span className="text-sm font-bold">{t('simuladorRetenciones.netoAnual')}</span>
                <span className="text-lg font-bold text-green-600">{formatEuro(resultado.netoAnual)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-sm text-muted-foreground">{t('simuladorRetenciones.netoMensual')}</span>
                <span className="text-lg font-bold text-green-600">{formatEuro(resultado.netoMensual)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-sm text-muted-foreground">{t('simuladorRetenciones.irpfRetencionMensual')}</span>
                <span className="text-sm">{formatEuro(resultado.retencionMensual)}</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-muted-foreground">{t('simuladorRetenciones.costeTotalEmpresa')}</span>
                <span className="text-sm font-medium">{formatEuro(resultado.costeEmpresa)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
