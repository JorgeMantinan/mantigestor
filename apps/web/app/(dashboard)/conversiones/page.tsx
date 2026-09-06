'use client'

import { useState, useCallback, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { FileSpreadsheet, ArrowRightLeft } from 'lucide-react'
import { SelectorMoneda } from '@/components/selector-moneda'
import { useLanguage } from '@/contexts/language-context'

type ConversionType = 'moneda' | 'longitud' | 'peso' | 'temperatura'

const MONEDAS = [
  { value: 'EUR', label: 'Euro (EUR)' },
  { value: 'USD', label: 'Dólar (USD)' },
  { value: 'GBP', label: 'Libra (GBP)' },
  { value: 'CHF', label: 'Franco suizo (CHF)' },
  { value: 'CAD', label: 'Dólar canadiense (CAD)' },
  { value: 'AUD', label: 'Dólar australiano (AUD)' },
  { value: 'JPY', label: 'Yen japonés (JPY)' },
  { value: 'MXN', label: 'Peso mexicano (MXN)' },
  { value: 'ARS', label: 'Peso argentino (ARS)' },
  { value: 'COP', label: 'Peso colombiano (COP)' },
  { value: 'BRL', label: 'Real brasileño (BRL)' },
]

const MONEDA_LABELS: Record<string, string> = {
  EUR: 'conversiones.monedaEur',
  USD: 'conversiones.monedaUsd',
  GBP: 'conversiones.monedaGbp',
  CHF: 'conversiones.monedaChf',
  CAD: 'conversiones.monedaCad',
  AUD: 'conversiones.monedaAud',
  JPY: 'conversiones.monedaJpy',
  MXN: 'conversiones.monedaMxn',
  ARS: 'conversiones.monedaArs',
  COP: 'conversiones.monedaCop',
  BRL: 'conversiones.monedaBrl',
}

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

const LONGITUD_LABELS: Record<string, string> = {
  mm: 'conversiones.longitudMm',
  cm: 'conversiones.longitudCm',
  m: 'conversiones.longitudM',
  km: 'conversiones.longitudKm',
  in: 'conversiones.longitudIn',
  ft: 'conversiones.longitudFt',
  yd: 'conversiones.longitudYd',
  mi: 'conversiones.longitudMi',
}

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

const PESO_LABELS: Record<string, string> = {
  mg: 'conversiones.pesoMg',
  g: 'conversiones.pesoG',
  kg: 'conversiones.pesoKg',
  t: 'conversiones.pesoT',
  oz: 'conversiones.pesoOz',
  lb: 'conversiones.pesoLb',
}

const PESO_A_KILOGRAMOS: Record<string, number> = {
  mg: 0.000001,
  g: 0.001,
  kg: 1,
  t: 1000,
  oz: 0.0283495,
  lb: 0.453592,
}

export default function ConversionesPage() {
  const { t } = useLanguage()
  const [tipo, setTipo] = useState<ConversionType>('moneda')
  const [cantidad, setCantidad] = useState('1')
  const [from, setFrom] = useState('EUR')
  const [to, setTo] = useState('USD')
  const [resultado, setResultado] = useState<string | null>(null)
  const [tasas, setTasas] = useState<Record<string, Record<string, number>>>({})
  const [cargandoTasas, setCargandoTasas] = useState(true)
  const [convirtiendo, setConvirtiendo] = useState(false)

  useEffect(() => {
    const fetchTasas = async () => {
      try {
        const allCodes = ['USD', 'GBP', 'CHF', 'CAD', 'AUD', 'JPY', 'MXN', 'ARS', 'COP', 'BRL']
        const res = await fetch(`https://api.frankfurter.dev/latest?from=EUR&to=${allCodes.join(',')}`)
        if (!res.ok) throw new Error('Failed to fetch')
        const data = await res.json()
        const eurRates = data.rates as Record<string, number>

        const newTasas: Record<string, Record<string, number>> = { EUR: { ...eurRates } }

        for (const from of allCodes) {
          newTasas[from] = {}
          for (const to of ['EUR', ...allCodes]) {
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
    { value: 'moneda', label: t('conversiones.tabMoneda') },
    { value: 'longitud', label: t('conversiones.tabLongitud') },
    { value: 'peso', label: t('conversiones.tabPeso') },
    { value: 'temperatura', label: t('conversiones.tabTemperatura') },
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
    setConvirtiendo(true)
    const val = parseFloat(cantidad)
    if (isNaN(val)) { setResultado(null); setConvirtiendo(false); return }

    let res: number

    switch (tipo) {
      case 'moneda': {
        if (from === to) { res = val; break }
        const tasa = (Object.keys(tasas).length > 0 ? tasas : TASAS_CAMBIO_APROX)[from]?.[to]
        if (!tasa) { setResultado(null); setConvirtiendo(false); return }
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
    setConvirtiendo(false)
  }, [tipo, cantidad, from, to, tasas])

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl font-heading font-bold tracking-tight">{t('conversiones.titulo')}</h1>
        <p className="text-muted-foreground">{t('conversiones.subtitulo')}</p>
      </div>

      <div className="flex gap-1 rounded-lg border p-1">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => { setTipo(tab.value); setResultado(null) }}
            className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              tipo === tab.value
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('conversiones.tituloConversor').replace('{tipo}', tipo === 'moneda' ? t('conversiones.tabMoneda').toLowerCase() : tipo === 'longitud' ? t('conversiones.tabLongitud').toLowerCase() : tipo === 'peso' ? t('conversiones.tabPeso').toLowerCase() : t('conversiones.tabTemperatura').toLowerCase())}</CardTitle>
          <CardDescription>
            {tipo === 'moneda' && (cargandoTasas ? t('conversiones.cargandoTasas') : t('conversiones.tasasEnTiempoReal'))}
            {tipo === 'temperatura' && t('conversiones.celsiusFahrenheitKelvin')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="cantidad">{t('conversiones.cantidad')}</Label>
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
                <Label>{t('conversiones.desde')}</Label>
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
                <Label>{t('conversiones.hasta')}</Label>
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
                <Label>{t('conversiones.desde')}</Label>
                {tipo === 'moneda' ? (
                  <SelectorMoneda
                    value={from}
                    onChange={(v) => { setFrom(v); setResultado(null) }}
                  />
                ) : (
                  <select
                    value={from}
                    onChange={(e) => { setFrom(e.target.value); setResultado(null) }}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                  >
                    {getFromUnits().map((u) => (
                      <option key={u.value} value={u.value}>{tipo === 'longitud' ? t(LONGITUD_LABELS[u.value] ?? '') : tipo === 'peso' ? t(PESO_LABELS[u.value] ?? '') : u.label}</option>
                    ))}
                  </select>
                )}
              </div>
              <div className="space-y-2">
                <Label>{t('conversiones.hasta')}</Label>
                {tipo === 'moneda' ? (
                  <SelectorMoneda
                    value={to}
                    onChange={(v) => { setTo(v); setResultado(null) }}
                  />
                ) : (
                  <select
                    value={to}
                    onChange={(e) => { setTo(e.target.value); setResultado(null) }}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                  >
                    {getFromUnits().map((u) => (
                      <option key={u.value} value={u.value}>{tipo === 'longitud' ? t(LONGITUD_LABELS[u.value] ?? '') : tipo === 'peso' ? t(PESO_LABELS[u.value] ?? '') : u.label}</option>
                    ))}
                  </select>
                )}
              </div>
            </div>
          )}

          <Button onClick={convert} className="w-full" disabled={convirtiendo}>
            <ArrowRightLeft className="mr-2 h-4 w-4" />
            {convirtiendo ? t('conversiones.convirtiendo') : t('conversiones.convertir')}
          </Button>

          {resultado !== null && (
            <div className="rounded-lg border bg-muted/50 p-6 text-center">
              <p className="text-sm text-muted-foreground">{t('conversiones.resultado')}</p>
              <p className="text-3xl font-bold">
                {parseFloat(cantidad) > 0 ? `${cantidad} ${from} = ${resultado} ${to}` : t('conversiones.introduceCantidad')}
              </p>
              {tipo === 'moneda' && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {t('conversiones.tasasAproximadas')}
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
