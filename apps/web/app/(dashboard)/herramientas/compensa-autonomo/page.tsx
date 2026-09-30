'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Calculator, TrendingUp, TrendingDown, Minus, Briefcase, User } from 'lucide-react'

const TRAMOS_IRPF_2026 = [
  { min: 0, max: 12450, tipo: 19 },
  { min: 12450, max: 20200, tipo: 24 },
  { min: 20200, max: 35200, tipo: 30 },
  { min: 35200, max: 60000, tipo: 37 },
  { min: 60000, max: 300000, tipo: 45 },
  { min: 300000, max: Infinity, tipo: 47 },
]

const TRAMOS_IRPF_MODULOS = [
  { min: 0, max: 12450, tipo: 19 },
  { min: 12450, max: 20200, tipo: 24 },
  { min: 20200, max: 35200, tipo: 30 },
  { min: 35200, max: 60000, tipo: 37 },
  { min: 60000, max: 300000, tipo: 45 },
  { min: 300000, max: Infinity, tipo: 47 },
]

function calcularIRPF(base: number, tramos: typeof TRAMOS_IRPF_2026): number {
  let irpf = 0
  let restante = Math.max(0, base)
  for (const tramo of tramos) {
    const tramoBase = Math.min(restante, tramo.max - tramo.min)
    if (tramoBase <= 0) break
    irpf += tramoBase * (tramo.tipo / 100)
    restante -= tramoBase
  }
  return Math.round(irpf)
}

function formatEuro(v: number): string {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(v)
}

export default function CompensaAutonomoPage() {
  const [salarioBruto, setSalarioBruto] = useState('')
  const [gastosEstimados, setGastosEstimados] = useState('')
  const [cuotaSS, setCuotaSS] = useState('80')
  const [horasSemanales, setHorasSemanales] = useState('40')

  const salarioNum = parseFloat(salarioBruto) || 0
  const gastosNum = parseFloat(gastosEstimados) || 0
  const cuotaSSNum = parseFloat(cuotaSS) || 80
  const horasNum = parseFloat(horasSemanales) || 40

  const resultado = useMemo(() => {
    if (salarioNum <= 0) return null

    // === CUENTA AJENA ===
    const ssTrabajador = Math.round(salarioNum * 0.065) // 6.5% trabajador
    const baseImponibleAjea = Math.max(0, salarioNum - ssTrabajador - 2000) // reducción general
    const irpfAjea = calcularIRPF(baseImponibleAjea, TRAMOS_IRPF_2026)
    const netoAjea = salarioNum - ssTrabajador - irpfAjea

    // === AUTÓNOMO ===
    const cuotaSSAnual = cuotaSSNum * 12
    const ingresosAnuales = salarioNum // mismo nivel bruto para comparar
    const baseImponibleAutonomo = Math.max(0, ingresosAnuales - gastosNum - cuotaSSAnual - 2000)
    const irpfAutonomo = calcularIRPF(baseImponibleAutonomo, TRAMOS_IRPF_MODULOS)
    const netoAutonomo = ingresosAnuales - gastosNum - cuotaSSAnual - irpfAutonomo

    const diferencia = netoAutonomo - netoAjea
    const horasAnuales = horasNum * 52
    const netoPorHoraAjea = horasAnuales > 0 ? netoAjea / horasAnuales : 0
    const netoPorHoraAutonomo = horasAnuales > 0 ? netoAutonomo / horasAnuales : 0

    return {
      ssTrabajador,
      baseImponibleAjea,
      irpfAjea,
      netoAjea,
      netoMensualAjea: netoAjea / 12,
      cuotaSSAnual,
      baseImponibleAutonomo,
      irpfAutonomo,
      netoAutonomo,
      netoMensualAutonomo: netoAutonomo / 12,
      diferencia,
      porcentajeDiferencia: netoAjea > 0 ? ((diferencia / netoAjea) * 100) : 0,
      netoPorHoraAjea,
      netoPorHoraAutonomo,
      horasAnuales,
      gastosDeducibles: gastosNum,
    }
  }, [salarioNum, gastosNum, cuotaSSNum, horasNum])

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">¿Me compensa ser autónomo?</h1>
        <p className="text-muted-foreground">
          Compara tu neto como empleado vs. autónomo con los mismos ingresos brutos
        </p>
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
              <Label htmlFor="salario-bruto">Salario bruto anual (cuenta ajena)</Label>
              <Input
                id="salario-bruto"
                type="number"
                step="1000"
                min="0"
                placeholder="30000"
                value={salarioBruto}
                onChange={e => setSalarioBruto(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gastos">Gastos estimados como autónomo (€/año)</Label>
              <Input
                id="gastos"
                type="number"
                step="500"
                min="0"
                placeholder="5000"
                value={gastosEstimados}
                onChange={e => setGastosEstimados(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cuota-ss">Cuota SS autónomo (€/mes)</Label>
              <Input
                id="cuota-ss"
                type="number"
                step="10"
                min="0"
                value={cuotaSS}
                onChange={e => setCuotaSS(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="horas">Horas trabajadas semanales</Label>
              <Input
                id="horas"
                type="number"
                min="1"
                max="80"
                value={horasSemanales}
                onChange={e => setHorasSemanales(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {resultado ? (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Comparativa</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between py-2 border-b">
                  <span className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Briefcase className="h-4 w-4" /> Cuenta ajena (neto anual)
                  </span>
                  <span className="text-lg font-bold text-blue-600">{formatEuro(resultado.netoAjea)}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b">
                  <span className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Briefcase className="h-4 w-4" /> Cuenta ajena (neto mensual)
                  </span>
                  <span className="font-medium">{formatEuro(resultado.netoMensualAjea)}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b">
                  <span className="flex items-center gap-2 text-sm text-muted-foreground">
                    <User className="h-4 w-4" /> Autónomo (neto anual)
                  </span>
                  <span className="text-lg font-bold text-green-600">{formatEuro(resultado.netoAutonomo)}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b">
                  <span className="flex items-center gap-2 text-sm text-muted-foreground">
                    <User className="h-4 w-4" /> Autónomo (neto mensual)
                  </span>
                  <span className="font-medium">{formatEuro(resultado.netoMensualAutonomo)}</span>
                </div>
                <div className={`flex items-center justify-between py-3 rounded-lg px-3 ${
                  resultado.diferencia > 0 ? 'bg-green-50 dark:bg-green-950' :
                  resultado.diferencia < 0 ? 'bg-red-50 dark:bg-red-950' : 'bg-muted'
                }`}>
                  <span className="font-medium">Diferencia anual</span>
                  <div className="flex items-center gap-2">
                    {resultado.diferencia > 0 ? (
                      <TrendingUp className="h-5 w-5 text-green-600" />
                    ) : resultado.diferencia < 0 ? (
                      <TrendingDown className="h-5 w-5 text-red-600" />
                    ) : (
                      <Minus className="h-5 w-5 text-muted-foreground" />
                    )}
                    <span className={`text-xl font-bold ${
                      resultado.diferencia > 0 ? 'text-green-600' :
                      resultado.diferencia < 0 ? 'text-red-600' : ''
                    }`}>
                      {resultado.diferencia > 0 ? '+' : ''}{formatEuro(resultado.diferencia)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="md:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Desglose detallado</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-blue-600 flex items-center gap-2">
                        <Briefcase className="h-4 w-4" /> Cuenta ajena
                      </p>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between"><span className="text-muted-foreground">Salario bruto</span><span>{formatEuro(salarioNum)}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">SS trabajador (6.5%)</span><span className="text-red-600">-{formatEuro(resultado.ssTrabajador)}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Base imponible IRPF</span><span>{formatEuro(resultado.baseImponibleAjea)}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">IRPF estimado</span><span className="text-red-600">-{formatEuro(resultado.irpfAjea)}</span></div>
                        <div className="flex justify-between font-bold border-t pt-1"><span>Neto anual</span><span className="text-blue-600">{formatEuro(resultado.netoAjea)}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Neto por hora</span><span>{formatEuro(resultado.netoPorHoraAjea)}/h</span></div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-green-600 flex items-center gap-2">
                        <User className="h-4 w-4" /> Autónomo
                      </p>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between"><span className="text-muted-foreground">Ingresos brutos</span><span>{formatEuro(salarioNum)}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Gastos deducibles</span><span className="text-red-600">-{formatEuro(resultado.gastosDeducibles)}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Cuota SS autónomo</span><span className="text-red-600">-{formatEuro(resultado.cuotaSSAnual)}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Base imponible IRPF</span><span>{formatEuro(resultado.baseImponibleAutonomo)}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">IRPF estimado</span><span className="text-red-600">-{formatEuro(resultado.irpfAutonomo)}</span></div>
                        <div className="flex justify-between font-bold border-t pt-1"><span>Neto anual</span><span className="text-green-600">{formatEuro(resultado.netoAutonomo)}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Neto por hora</span><span>{formatEuro(resultado.netoPorHoraAutonomo)}/h</span></div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="md:col-span-2">
              <CardContent className="pt-6">
                <div className={`rounded-lg p-4 ${
                  resultado.diferencia > 0
                    ? 'bg-green-50 border border-green-200 dark:bg-green-950 dark:border-green-800'
                    : resultado.diferencia < 0
                    ? 'bg-red-50 border border-red-200 dark:bg-red-950 dark:border-red-800'
                    : 'bg-muted'
                }`}>
                  <p className="font-medium">
                    {resultado.diferencia > 0 ? (
                      <>Autónomo te compensa: ganarías <strong>{formatEuro(resultado.diferencia)}</strong> más al año ({resultado.porcentajeDiferencia.toFixed(1)}% más).</>
                    ) : resultado.diferencia < 0 ? (
                      <>Cuenta ajena te compensa: ganarías <strong>{formatEuro(Math.abs(resultado.diferencia))}</strong> más al año como empleado.</>
                    ) : (
                      <>Ambas opciones dan el mismo neto.</>
                    )}
                  </p>
                  {resultado.diferencia > 0 && (
                    <p className="text-sm text-muted-foreground mt-1">
                      Considera también: vacaciones pagadas, baja por enfermedad, prestación por desempleo y estabilidad laboral.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </>
        ) : (
          <Card className="flex items-center justify-center min-h-[300px]">
            <CardContent>
              <p className="text-muted-foreground text-center">
                Introduce tu salario bruto anual para ver la comparativa
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
