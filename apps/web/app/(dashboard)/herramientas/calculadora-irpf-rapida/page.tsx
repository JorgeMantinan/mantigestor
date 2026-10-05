'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Calculator, TrendingUp, TrendingDown, Minus, Download } from 'lucide-react'
import { generarPDF } from '@/lib/pdf'

const TRAMOS_IRPF_2026 = [
  { min: 0, max: 12450, tipo: 19 },
  { min: 12450, max: 20200, tipo: 24 },
  { min: 20200, max: 35200, tipo: 30 },
  { min: 35200, max: 60000, tipo: 37 },
  { min: 60000, max: 300000, tipo: 45 },
  { min: 300000, max: Infinity, tipo: 47 },
]

const SALARIOS_COMPARATIVA = [
  { salario: 18000, label: 'SMI 2026' },
  { salario: 24000, label: 'Júnior' },
  { salario: 30000, label: 'Intermedio' },
  { salario: 40000, label: 'Senior' },
  { salario: 60000, label: 'Experto' },
]

function formatEuro(v: number): string {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(v)
}

function calcularIRPF(base: number): number {
  let irpf = 0
  let restante = Math.max(0, base)
  for (const tramo of TRAMOS_IRPF_2026) {
    const tramoBase = Math.min(restante, tramo.max - tramo.min)
    if (tramoBase <= 0) break
    irpf += tramoBase * (tramo.tipo / 100)
    restante -= tramoBase
  }
  return Math.round(irpf)
}

export default function CalculadoraIRPFRapidaPage() {
  const [salarioBruto, setSalarioBruto] = useState(30000)
  const [reduccionGeneral, setReduccionGeneral] = useState(2000)
  const [otrosGastosDeducibles, setOtrosGastosDeducibles] = useState(0)
  const [generando, setGenerando] = useState(false)

  const resultado = useMemo(() => {
    const ssTrabajador = Math.round(salarioBruto * 0.065)
    const cuotaSSTrabajador = ssTrabajador
    const baseImponible = Math.max(0, salarioBruto - ssTrabajador - reduccionGeneral - otrosGastosDeducibles)
    const irpf = calcularIRPF(baseImponible)
    const totalRetenciones = ssTrabajador + irpf
    const netoAnual = salarioBruto - totalRetenciones
    const netoMensual = netoAnual / 12
    const cuotaSSEmpresa = Math.round(salarioBruto * 0.229)
    const costeTotalEmpresa = salarioBruto + cuotaSSEmpresa
    const porcentajeEfectivo = salarioBruto > 0 ? (totalRetenciones / salarioBruto) * 100 : 0

    return {
      ssTrabajador,
      cuotaSSTrabajador,
      cuotaSSEmpresa,
      baseImponible,
      irpf,
      totalRetenciones,
      netoAnual,
      netoMensual,
      costeTotalEmpresa,
      porcentajeEfectivo,
      salarioBruto,
    }
  }, [salarioBruto, reduccionGeneral, otrosGastosDeducibles])

  const comparativas = useMemo(() => {
    return SALARIOS_COMPARATIVA.map(s => {
      const base = Math.max(0, s.salario - Math.round(s.salario * 0.065) - reduccionGeneral)
      const irpf = calcularIRPF(base)
      const ss = Math.round(s.salario * 0.065)
      const neto = s.salario - irpf - ss
      const porcentaje = s.salario > 0 ? ((irpf + ss) / s.salario) * 100 : 0
      const dif = resultado.salarioBruto - s.salario
      return {
        ...s,
        irpf,
        ss,
        neto,
        netoMensual: neto / 12,
        porcentaje,
        diferencia: dif,
      }
    }).sort((a, b) => a.salario - b.salario)
  }, [reduccionGeneral, resultado.salarioBruto])

  const handleExportPDF = async () => {
    setGenerando(true)
    try {
      await generarPDF(document.getElementById('resultado-irpf')!, 'calculo-irpf-2026')
    } catch (err) {
      console.error('Error:', err)
    }
    setGenerando(false)
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">¿Cuánto me toca de IRPF?</h1>
          <p className="text-muted-foreground">Calcula tu IRPF por tramos con la escala 2026</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleExportPDF} disabled={generando}>
          <Download className="mr-1.5 h-3 w-3" />
          {generando ? 'Generando...' : 'Exportar PDF'}
        </Button>
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
              <Label htmlFor="salario">Salario bruto anual (€)</Label>
              <Input
                id="salario"
                type="number"
                step="1000"
                min="0"
                placeholder="30000"
                value={salarioBruto}
                onChange={e => setSalarioBruto(parseInt(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reduccion">Reducción general IRPF (€)</Label>
              <Input
                id="reduccion"
                type="number"
                step="100"
                min="0"
                value={reduccionGeneral}
                onChange={e => setReduccionGeneral(parseInt(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="otros-gastos">Otros gastos deducibles (€)</Label>
              <Input
                id="otros-gastos"
                type="number"
                step="100"
                min="0"
                value={otrosGastosDeducibles}
                onChange={e => setOtrosGastosDeducibles(parseInt(e.target.value) || 0)}
              />
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
                <span className="text-sm text-muted-foreground">Salario bruto anual</span>
                <span className="text-sm font-bold">{formatEuro(resultado.salarioBruto)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-sm text-muted-foreground">SS Trabajador (6.5%)</span>
                <span className="text-sm text-red-600">-{formatEuro(resultado.ssTrabajador)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-sm text-muted-foreground">Base imponible IRPF</span>
                <span className="text-sm">{formatEuro(resultado.baseImponible)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-sm text-muted-foreground">IRPF estimado</span>
                <span className="text-sm text-red-600">-{formatEuro(resultado.irpf)}</span>
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
                <span className="text-sm text-muted-foreground">SS Empresa (22.9%)</span>
                <span className="text-sm text-muted-foreground">{formatEuro(resultado.cuotaSSEmpresa)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-sm text-muted-foreground">Coste total empresa</span>
                <span className="text-sm font-medium">{formatEuro(resultado.costeTotalEmpresa)}</span>
              </div>
              <div className="flex justify-between items-center py-3">
                <span className="text-sm font-medium">Retención efectiva total</span>
                <Badge variant={resultado.porcentajeEfectivo > 30 ? 'destructive' : resultado.porcentajeEfectivo > 20 ? 'secondary' : 'outline'}>
                  {resultado.porcentajeEfectivo.toFixed(1)}%
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card id="resultado-irpf">
        <CardHeader>
          <CardTitle className="text-sm font-medium">Comparativa con otros salarios</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {comparativas.map(c => {
              const isCurrent = c.salario === resultado.salarioBruto
              return (
                <div
                  key={c.salario}
                  className={`flex items-center justify-between rounded-lg border p-3 text-sm transition-opacity ${
                    isCurrent ? 'border-primary bg-primary/5' : ''
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-xs font-medium text-muted-foreground w-20">{c.label}</span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{formatEuro(c.salario)}</span>
                        {isCurrent && <Badge variant="secondary" className="text-xs">Tú</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        IRPF: {formatEuro(c.irpf)} | SS: {formatEuro(c.ss)} | Neto: {formatEuro(c.netoMensual)}/mes
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {!isCurrent && resultado.salarioBruto > 0 && (
                      <>
                        {c.diferencia > 0 ? (
                          <TrendingUp className="h-3 w-3 text-green-600" />
                        ) : c.diferencia < 0 ? (
                          <TrendingDown className="h-3 w-3 text-red-600" />
                        ) : (
                          <Minus className="h-3 w-3 text-muted-foreground" />
                        )}
                        <span className={`text-xs ${c.diferencia > 0 ? 'text-green-600' : c.diferencia < 0 ? 'text-red-600' : 'text-muted-foreground'}`}>
                          {c.diferencia > 0 ? '+' : ''}{formatEuro(c.diferencia)}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="space-y-2">
            <p className="text-sm font-medium">Escalas IRPF 2026</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs text-muted-foreground">
              {TRAMOS_IRPF_2026.map(t => (
                <div key={t.tipo} className="flex justify-between rounded bg-muted px-2 py-1">
                  <span>{formatEuro(t.min)} - {t.max === Infinity ? '∞' : formatEuro(t.max)}</span>
                  <span className="font-medium">{t.tipo}%</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
