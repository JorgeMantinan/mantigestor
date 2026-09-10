'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Calculator, ArrowLeftRight, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react'

const TRAMOS_IRPF_2026 = [
  { min: 0, max: 12450, tipo: 19 },
  { min: 12450, max: 20200, tipo: 24 },
  { min: 20200, max: 35200, tipo: 30 },
  { min: 35200, max: 60000, tipo: 37 },
  { min: 60000, max: 300000, tipo: 45 },
  { min: 300000, max: Infinity, tipo: 47 },
]

// Coeficientes módulos simplificados por actividad (ejemplos)
const MODULOS_EJEMPLO: Record<string, { beneficioBase: number; moduloMensual: number }> = {
  'restaurante': { beneficioBase: 15000, moduloMensual: 1200 },
  'tienda': { beneficioBase: 12000, moduloMensual: 900 },
  'profesional': { beneficioBase: 18000, moduloMensual: 600 },
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

function formatEuro(v: number): string {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(v)
}

export default function AnalisisRegimenPage() {
  const [regimenActual, setRegimenActual] = useState<'modulos' | 'directa'>('modulos')
  const [ingresosAnuales, setIngresosAnuales] = useState('')
  const [gastosReales, setGastosReales] = useState('')
  const [gastosModulos, setGastosModulos] = useState('')
  const [cuotaSS, setCuotaSS] = useState('80')
  const [ivaSoportado, setIvaSoportado] = useState('')
  const [numeroTrabajadores, setNumeroTrabajadores] = useState('0')
  const [superficieLocal, setSuperficieLocal] = useState('0')

  const ingresos = parseFloat(ingresosAnuales) || 0
  const gastosR = parseFloat(gastosReales) || 0
  const gastosM = parseFloat(gastosModulos) || 0
  const cuotaSSNum = parseFloat(cuotaSS) || 80
  const ivaSop = parseFloat(ivaSoportado) || 0
  const trabajadores = parseInt(numeroTrabajadores) || 0
  const superficie = parseFloat(superficieLocal) || 0

  const resultado = useMemo(() => {
    if (ingresos <= 0) return null

    const cuotaSSAnual = cuotaSSNum * 12

    // === ESTIMACIÓN DIRECTA ===
    // Base = Ingresos - Gastos reales - Cuota SS
    const baseDirecta = Math.max(0, ingresos - gastosR - cuotaSSAnual)
    const irpfDirecta = calcularIRPF(baseDirecta)
    const netoDirecta = ingresos - gastosR - cuotaSSAnual - irpfDirecta

    // IVA en estimación directa: cobras IVA en ventas, pagas IVA en compras
    // Tipo medio IVA 21% en ventas, IVA soportado deducible
    const ivaCobrado = Math.round(ingresos * 0.21)
    const ivaLiquidado = ivaCobrado - ivaSop

    // === MÓDULOS ===
    // Base = Ingresos - Gastos módulos (estimación Hacienda) - Cuota SS
    // En módulos, los gastos son los que marca Hacienda, no los reales
    const baseModulos = Math.max(0, ingresos - gastosM - cuotaSSAnual)
    const irpfModulos = calcularIRPF(baseModulos)
    const netoModulos = ingresos - gastosM - cuotaSSAnual - irpfModulos

    // En módulos, el IVA se calcula por módulos (no se deducen gastos reales)
    const ivaModulos = Math.round(ingresos * 0.21 * 0.5) // Simplificado: ~50% del IVA como módulo

    const diferencia = netoDirecta - netoModulos
    const ahorroAnual = Math.abs(diferencia)

    // Verificar límites módulos
    const limiteModulos = 150000 // Límite general para módulos
    const excedeLimite = ingresos > limiteModulos

    // Verificar actividad compatible con módulos
    const actividadesModulos = ['restaurante', 'tienda', 'profesional']

    return {
      baseDirecta,
      irpfDirecta,
      netoDirecta,
      netoMensualDirecta: netoDirecta / 12,
      ivaCobrado,
      ivaSop,
      ivaLiquidado,
      baseModulos,
      irpfModulos,
      netoModulos,
      netoMensualModulos: netoModulos / 12,
      ivaModulos,
      diferencia,
      ahorroAnual,
      mejorRegimen: diferencia > 0 ? 'directa' : diferencia < 0 ? 'modulos' : 'igual',
      excedeLimite,
      cuotaSSAnual,
    }
  }, [ingresos, gastosR, gastosM, cuotaSSNum, ivaSop, trabajadores, superficie])

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">¿Estás pagando de más?</h1>
        <p className="text-muted-foreground">
          Analiza si te conviene cambiar de régimen fiscal (estimación directa ↔ módulos)
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Calculator className="h-4 w-4" /> Régimen actual
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Régimen fiscal actual</Label>
              <div className="flex gap-2">
                <Button
                  variant={regimenActual === 'modulos' ? 'default' : 'outline'}
                  onClick={() => setRegimenActual('modulos')}
                  className="flex-1"
                >
                  Módulos
                </Button>
                <Button
                  variant={regimenActual === 'directa' ? 'default' : 'outline'}
                  onClick={() => setRegimenActual('directa')}
                  className="flex-1"
                >
                  Estimación directa
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ingresos-anuales">Ingresos anuales (€)</Label>
              <Input
                id="ingresos-anuales"
                type="number"
                step="1000"
                min="0"
                placeholder="40000"
                value={ingresosAnuales}
                onChange={e => setIngresosAnuales(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gastos-reales">Gastos reales deducibles (€/año)</Label>
              <Input
                id="gastos-reales"
                type="number"
                step="500"
                min="0"
                placeholder="8000"
                value={gastosReales}
                onChange={e => setGastosReales(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gastos-modulos">Gastos según módulos de Hacienda (€/año)</Label>
              <Input
                id="gastos-modulos"
                type="number"
                step="500"
                min="0"
                placeholder="12000"
                value={gastosModulos}
                onChange={e => setGastosModulos(e.target.value)}
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
              <Label htmlFor="iva-soportado">IVA soportado deducible (€/año)</Label>
              <Input
                id="iva-soportado"
                type="number"
                step="100"
                min="0"
                placeholder="3000"
                value={ivaSoportado}
                onChange={e => setIvaSoportado(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {resultado ? (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <ArrowLeftRight className="h-4 w-4" /> Comparativa de regímenes
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-lg border p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Estimación directa</span>
                    <Badge variant={resultado.mejorRegimen === 'directa' ? 'default' : 'secondary'}>
                      {resultado.mejorRegimen === 'directa' ? '✓ Mejor opción' : 'Opción actual'}
                    </Badge>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between"><span className="text-muted-foreground">Base IRPF</span><span>{formatEuro(resultado.baseDirecta)}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">IRPF</span><span className="text-red-600">-{formatEuro(resultado.irpfDirecta)}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">IVA a liquidar</span><span>{formatEuro(resultado.ivaLiquidado)}</span></div>
                    <div className="flex justify-between font-bold border-t pt-1"><span>Neto anual</span><span className="text-blue-600">{formatEuro(resultado.netoDirecta)}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Neto mensual</span><span>{formatEuro(resultado.netoMensualDirecta)}</span></div>
                  </div>
                </div>

                <div className="rounded-lg border p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Módulos</span>
                    <Badge variant={resultado.mejorRegimen === 'modulos' ? 'default' : 'secondary'}>
                      {resultado.mejorRegimen === 'modulos' ? '✓ Mejor opción' : 'Opción actual'}
                    </Badge>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between"><span className="text-muted-foreground">Base IRPF</span><span>{formatEuro(resultado.baseModulos)}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">IRPF</span><span className="text-red-600">-{formatEuro(resultado.irpfModulos)}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">IVA módulos</span><span>{formatEuro(resultado.ivaModulos)}</span></div>
                    <div className="flex justify-between font-bold border-t pt-1"><span>Neto anual</span><span className="text-green-600">{formatEuro(resultado.netoModulos)}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Neto mensual</span><span>{formatEuro(resultado.netoMensualModulos)}</span></div>
                  </div>
                </div>

                <div className={`rounded-lg p-4 ${
                  resultado.diferencia !== 0
                    ? resultado.mejorRegimen === regimenActual
                    ? 'bg-green-50 border border-green-200 dark:bg-green-950 dark:border-green-800'
                    : 'bg-amber-50 border border-amber-200 dark:bg-amber-950 dark:border-amber-800'
                    : 'bg-muted'
                }`}>
                  <div className="flex items-center gap-2 mb-1">
                    {resultado.diferencia > 0 ? (
                      <TrendingUp className="h-5 w-5 text-green-600" />
                    ) : resultado.diferencia < 0 ? (
                      <TrendingDown className="h-5 w-5 text-amber-600" />
                    ) : (
                      <ArrowLeftRight className="h-5 w-5 text-muted-foreground" />
                    )}
                    <p className="font-medium">
                      {resultado.diferencia > 0 ? (
                        <>En estimación directa ganarías <strong>{formatEuro(resultado.ahorroAnual)}</strong> más</>
                      ) : resultado.diferencia < 0 ? (
                        <>En módulos ganarías <strong>{formatEuro(resultado.ahorroAnual)}</strong> más</>
                      ) : (
                        <>Ambos regímenes dan el mismo resultado</>
                      )}
                    </p>
                  </div>
                  {resultado.excedeLimite && (
                    <div className="flex items-start gap-2 mt-2 text-sm text-amber-700 dark:text-amber-300">
                      <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                      <p>Tus ingresos superan los 150.000€. No puedes estar en módulos.</p>
                    </div>
                  )}
                </div>

                {resultado.mejorRegimen !== regimenActual && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm dark:bg-amber-950 dark:border-amber-800">
                    <p className="font-medium text-amber-800 dark:text-amber-200">
                      Recomendación: Cambia a {resultado.mejorRegimen === 'directa' ? 'estimación directa' : 'módulos'}
                    </p>
                    <p className="text-amber-700 dark:text-amber-300 mt-1">
                      {resultado.mejorRegimen === 'directa' ? (
                        'Tus gastos reales son significativamente superiores a los gastos que admite Hacienda en módulos. En estimación directa puedes deducir todos tus gastos reales.'
                      ) : (
                        'Tus gastos reales son bajos comparados con lo que Hacienda admite en módulos. En módulos pagas IRPF sobre una base más baja.'
                      )}
                    </p>
                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
                      El cambio de régimen se solicita en el Modelo 036/037 durante el mes de diciembre para el siguiente año fiscal.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        ) : (
          <Card className="flex items-center justify-center min-h-[300px]">
            <CardContent>
              <p className="text-muted-foreground text-center">
                Introduce tus datos para comparar regímenes fiscales
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
