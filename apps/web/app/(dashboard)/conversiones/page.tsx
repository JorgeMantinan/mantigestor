'use client'

import { useState, useCallback, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { FileSpreadsheet, ArrowRightLeft } from 'lucide-react'

type ConversionType = 'moneda' | 'longitud' | 'peso' | 'temperatura'

const MONEDAS = [
  { value: 'EUR', label: 'Euro (EUR)' },
  { value: 'USD', label: 'Dólar (USD)' },
  { value: 'GBP', label: 'Libra (GBP)' },
  { value: 'CHF', label: 'Franco suizo (CHF)' },
  { value: 'MXN', label: 'Peso mexicano (MXN)' },
  { value: 'ARS', label: 'Peso argentino (ARS)' },
  { value: 'COP', label: 'Peso colombiano (COP)' },
]

const TASAS_CAMBIO_APROX: Record<string, Record<string, number>> = {
  EUR: { USD: 1.08, GBP: 0.85, CHF: 0.96, MXN: 19.5, ARS: 950, COP: 4200 },
  USD: { EUR: 0.93, GBP: 0.79, CHF: 0.89, MXN: 18.1, ARS: 880, COP: 3900 },
  GBP: { EUR: 1.18, USD: 1.27, CHF: 1.13, MXN: 22.9, ARS: 1110, COP: 4950 },
  CHF: { EUR: 1.04, USD: 1.12, GBP: 0.88, MXN: 20.3, ARS: 990, COP: 4375 },
  MXN: { EUR: 0.051, USD: 0.055, GBP: 0.044, CHF: 0.049, ARS: 48.5, COP: 215 },
  ARS: { EUR: 0.00105, USD: 0.00114, GBP: 0.0009, CHF: 0.00101, MXN: 0.0206, COP: 4.42 },
  COP: { EUR: 0.000238, USD: 0.000256, GBP: 0.000202, CHF: 0.000229, MXN: 0.00465, ARS: 0.226 },
}

const UNIDADES_LONGITUD = [
  { value: 'mm', label: 'Milímetro (mm)' },
  { value: 'cm', label: 'Centímetro (cm)' },
  { value: 'm', label: 'Metro (m)' },
  { value: 'km', label: 'Kilómetro (km)' },
  { value: 'in', label: 'Pulgada (in)' },
  { value: 'ft', label: 'Pie (ft)' },
  { value: 'yd', label: 'Yarda (yd)' },
  { value: 'mi', label: 'Milla (mi)' },
]

const LONGITUD_A_METROS: Record<string, number> = {
  mm: 0.001,
  cm: 0.01,
  m: 1,
  km: 1000,
  in: 0.0254,
  ft: 0.3048,
  yd: 0.9144,
  mi: 1609.344,
}

const UNIDADES_PESO = [
  { value: 'mg', label: 'Miligramo (mg)' },
  { value: 'g', label: 'Gramo (g)' },
  { value: 'kg', label: 'Kilogramo (kg)' },
  { value: 't', label: 'Tonelada (t)' },
  { value: 'oz', label: 'Onza (oz)' },
  { value: 'lb', label: 'Libra (lb)' },
]

const PESO_A_KILOGRAMOS: Record<string, number> = {
  mg: 0.000001,
  g: 0.001,
  kg: 1,
  t: 1000,
  oz: 0.0283495,
  lb: 0.453592,
}

export default function ConversionesPage() {
  const [tipo, setTipo] = useState<ConversionType>('moneda')
  const [cantidad, setCantidad] = useState('1')
  const [from, setFrom] = useState('EUR')
  const [to, setTo] = useState('USD')
  const [resultado, setResultado] = useState<string | null>(null)
  const [tasas, setTasas] = useState<Record<string, Record<string, number>>>({})
  const [cargandoTasas, setCargandoTasas] = useState(true)

  useEffect(() => {
    const fetchTasas = async () => {
      try {
        const res = await fetch('https://api.frankfurter.dev/latest?from=EUR&to=USD,GBP,CHF,MXN,ARS,COP')
        if (!res.ok) throw new Error('Failed to fetch')
        const data = await res.json()
        const eurRates = data.rates as Record<string, number>

        const newTasas: Record<string, Record<string, number>> = { EUR: { ...eurRates } }

        for (const from of ['USD', 'GBP', 'CHF', 'MXN', 'ARS', 'COP']) {
          newTasas[from] = {}
          for (const to of ['EUR', 'USD', 'GBP', 'CHF', 'MXN', 'ARS', 'COP']) {
            if (from === to) continue
            if (to === 'EUR') {
              newTasas[from][to] = 1 / (eurRates[from] ?? 1)
            } else {
              newTasas[from][to] = (eurRates[to] ?? 1) / (eurRates[from] ?? 1)
            }
          }
        }

        setTasas(newTasas)
      } catch {
      }
      setCargandoTasas(false)
    }

    fetchTasas()
  }, [])

  const tabs: { value: ConversionType; label: string }[] = [
    { value: 'moneda', label: 'Moneda' },
    { value: 'longitud', label: 'Longitud' },
    { value: 'peso', label: 'Peso' },
    { value: 'temperatura', label: 'Temperatura' },
  ]

  const getFromUnits = () => {
    switch (tipo) {
      case 'moneda': return MONEDAS
      case 'longitud': return UNIDADES_LONGITUD
      case 'peso': return UNIDADES_PESO
      default: return []
    }
  }

  const convert = useCallback(() => {
    const val = parseFloat(cantidad)
    if (isNaN(val)) { setResultado(null); return }

    let res: number

    switch (tipo) {
      case 'moneda': {
        if (from === to) { res = val; break }
        const tasa = (Object.keys(tasas).length > 0 ? tasas : TASAS_CAMBIO_APROX)[from]?.[to]
        if (!tasa) { setResultado(null); return }
        res = val * tasa
        break
      }
      case 'longitud': {
        const enMetros = val * (LONGITUD_A_METROS[from] ?? 1)
        res = enMetros / (LONGITUD_A_METROS[to] ?? 1)
        break
      }
      case 'peso': {
        const enKg = val * (PESO_A_KILOGRAMOS[from] ?? 1)
        res = enKg / (PESO_A_KILOGRAMOS[to] ?? 1)
        break
      }
      case 'temperatura': {
        if (from === 'C' && to === 'F') res = (val * 9 / 5) + 32
        else if (from === 'F' && to === 'C') res = (val - 32) * 5 / 9
        else if (from === 'C' && to === 'K') res = val + 273.15
        else if (from === 'K' && to === 'C') res = val - 273.15
        else if (from === 'F' && to === 'K') res = (val - 32) * 5 / 9 + 273.15
        else if (from === 'K' && to === 'F') res = (val - 273.15) * 9 / 5 + 32
        else res = val
        break
      }
      default:
        res = val
    }

    const decimals = tipo === 'moneda' ? 2 : 4
    setResultado(res.toFixed(decimals))
  }, [tipo, cantidad, from, to, tasas])

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl font-heading font-bold tracking-tight">Conversiones</h1>
        <p className="text-muted-foreground">Conversor de moneda, longitud, peso y temperatura</p>
      </div>

      <div className="flex gap-1 rounded-lg border p-1">
        {tabs.map((t) => (
          <button
            key={t.value}
            onClick={() => { setTipo(t.value); setResultado(null) }}
            className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              tipo === t.value
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Conversor de {tipo === 'moneda' ? 'moneda' : tipo === 'longitud' ? 'longitud' : tipo === 'peso' ? 'peso' : 'temperatura'}</CardTitle>
          <CardDescription>
            {tipo === 'moneda' && (cargandoTasas ? 'Actualizando tasas...' : 'Tasas de cambio en tiempo real (Frankfurter API)')}
            {tipo === 'temperatura' && 'Celsius, Fahrenheit y Kelvin'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="cantidad">Cantidad</Label>
            <Input
              id="cantidad"
              type="number"
              step="any"
              value={cantidad}
              onChange={(e) => setCantidad(e.target.value)}
              placeholder="1"
            />
          </div>

          {tipo === 'temperatura' ? (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Desde</Label>
                <select
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                >
                  <option value="C">Celsius (°C)</option>
                  <option value="F">Fahrenheit (°F)</option>
                  <option value="K">Kelvin (K)</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Hasta</Label>
                <select
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                >
                  <option value="C">Celsius (°C)</option>
                  <option value="F">Fahrenheit (°F)</option>
                  <option value="K">Kelvin (K)</option>
                </select>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Desde</Label>
                <select
                  value={from}
                  onChange={(e) => { setFrom(e.target.value); setResultado(null) }}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                >
                  {getFromUnits().map((u) => (
                    <option key={u.value} value={u.value}>{u.label}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Hasta</Label>
                <select
                  value={to}
                  onChange={(e) => { setTo(e.target.value); setResultado(null) }}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                >
                  {getFromUnits().map((u) => (
                    <option key={u.value} value={u.value}>{u.label}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          <Button onClick={convert} className="w-full">
            <ArrowRightLeft className="mr-2 h-4 w-4" />
            Convertir
          </Button>

          {resultado !== null && (
            <div className="rounded-lg border bg-muted/50 p-6 text-center">
              <p className="text-sm text-muted-foreground">Resultado</p>
              <p className="text-3xl font-bold">
                {parseFloat(cantidad) > 0 ? `${cantidad} ${from} = ${resultado} ${to}` : 'Introduce una cantidad'}
              </p>
              {tipo === 'moneda' && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Tasas de cambio aproximadas. Consulta tu banco para valores exactos.
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
