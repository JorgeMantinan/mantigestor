'use client'

import { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Plus, Trash2 } from 'lucide-react'
import { eur, parseEuros } from './types'
import { LabelConAyuda } from './label-con-ayuda'
import { GUIA_MODELO_236 } from '@/lib/fiscal/guia-fiscal'
import { SELECT_CLS } from '@/lib/ui-constants'
import {
  calcularModelo236,
  PAISES_COMUNES,
  type CuentaBancariaExtranjero236,
  type InmuebleExtranjero236,
  type ValorExtranjero236,
  type SeguroExtranjero236,
} from '@mantigestor/utils'
import { BotonPDF } from '@/components/boton-pdf'

type Seccion = 'cuentas' | 'inmuebles' | 'valores' | 'seguros'

export function CalculadoraModelo236() {
  const [seccion, setSeccion] = useState<Seccion>('cuentas')

  const [cuentas, setCuentas] = useState<CuentaBancariaExtranjero236[]>([])
  const [inmuebles, setInmuebles] = useState<InmuebleExtranjero236[]>([])
  const [valores, setValores] = useState<ValorExtranjero236[]>([])
  const [seguros, setSeguros] = useState<SeguroExtranjero236[]>([])

  // Form — cuentas
  const [cEntidad, setCEntidad] = useState('')
  const [cPais, setCPais] = useState('')
  const [cIban, setCIban] = useState('')
  const [cSaldoFinal, setCSaldoFinal] = useState('')
  const [cSaldoMaximo, setCSaldoMaximo] = useState('')

  // Form — inmuebles
  const [iDireccion, setIDireccion] = useState('')
  const [iPais, setIPais] = useState('')
  const [iValor, setIValor] = useState('')

  // Form — valores
  const [vEntidad, setVEntidad] = useState('')
  const [vPais, setVPais] = useState('')
  const [vValor, setVValor] = useState('')

  // Form — seguros
  const [sEntidad, setSEntidad] = useState('')
  const [sPais, setSPais] = useState('')
  const [sCapital, setSCapital] = useState('')

  const resultado = useMemo(
    () => calcularModelo236({ cuentasBancarias: cuentas, inmuebles, valores, seguros }),
    [cuentas, inmuebles, valores, seguros],
  )

  const addCuenta = () => {
    if (!cEntidad || !cPais || !cSaldoFinal) return
    const sf = parseEuros(cSaldoFinal)
    const sm = parseEuros(cSaldoMaximo)
    if (sf === null) return
    setCuentas(prev => [...prev, {
      entidad: cEntidad,
      pais: cPais,
      iban: cIban,
      saldoFinalCents: sf,
      saldoMaximoCents: sm ?? sf,
    }])
    setCEntidad(''); setCPais(''); setCIban(''); setCSaldoFinal(''); setCSaldoMaximo('')
  }

  const addInmueble = () => {
    if (!iDireccion || !iPais || !iValor) return
    const v = parseEuros(iValor)
    if (v === null) return
    setInmuebles(prev => [...prev, { direccion: iDireccion, pais: iPais, valorCents: v }])
    setIDireccion(''); setIPais(''); setIValor('')
  }

  const addValor = () => {
    if (!vEntidad || !vPais || !vValor) return
    const v = parseEuros(vValor)
    if (v === null) return
    setValores(prev => [...prev, { entidad: vEntidad, pais: vPais, valorFinalCents: v }])
    setVEntidad(''); setVPais(''); setVValor('')
  }

  const addSeguro = () => {
    if (!sEntidad || !sPais || !sCapital) return
    const c = parseEuros(sCapital)
    if (c === null) return
    setSeguros(prev => [...prev, { entidad: sEntidad, pais: sPais, capitalCents: c }])
    setSEntidad(''); setSPais(''); setSCapital('')
  }

  const removeCuenta = (idx: number) => setCuentas(prev => prev.filter((_, i) => i !== idx))
  const removeInmueble = (idx: number) => setInmuebles(prev => prev.filter((_, i) => i !== idx))
  const removeValor = (idx: number) => setValores(prev => prev.filter((_, i) => i !== idx))
  const removeSeguro = (idx: number) => setSeguros(prev => prev.filter((_, i) => i !== idx))

  const TABS: Array<{ key: Seccion; label: string; count: number }> = [
    { key: 'cuentas', label: 'Cuentas bancarias', count: cuentas.length },
    { key: 'inmuebles', label: 'Inmuebles', count: inmuebles.length },
    { key: 'valores', label: 'Valores', count: valores.length },
    { key: 'seguros', label: 'Seguros', count: seguros.length },
  ]

  return (
    <div id="pdf-modelo-236" className="space-y-3">
      <BotonPDF elementId="pdf-modelo-236" filename="modelo-236" />
      <Card>
        <CardHeader>
          <CardTitle>Modelo 236 — Bienes en el extranjero</CardTitle>
          <CardDescription>
            Declaración informativa obligatoria si el valor total supera 50.000€
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Summary */}
          <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-lg border p-3">
              <dt className="text-xs text-muted-foreground">Cuentas bancarias</dt>
              <dd className="font-semibold">{eur(resultado.totalCuentas)}</dd>
            </div>
            <div className="rounded-lg border p-3">
              <dt className="text-xs text-muted-foreground">Inmuebles</dt>
              <dd className="font-semibold">{eur(resultado.totalInmuebles)}</dd>
            </div>
            <div className="rounded-lg border p-3">
              <dt className="text-xs text-muted-foreground">Valores</dt>
              <dd className="font-semibold">{eur(resultado.totalValores)}</dd>
            </div>
            <div className="rounded-lg border p-3">
              <dt className="text-xs text-muted-foreground">Seguros</dt>
              <dd className="font-semibold">{eur(resultado.totalSeguros)}</dd>
            </div>
            <div className="rounded-lg border p-3">
              <dt className="text-xs text-muted-foreground">N.º entidades</dt>
              <dd className="font-semibold">{resultado.numEntidades}</dd>
            </div>
            <div className={`rounded-lg border p-3 ${resultado.totalGlobal > 50_000_00 ? 'border-red-500/50 bg-red-500/5' : 'border-green-500/50 bg-green-500/5'}`}>
              <dt className="text-xs text-muted-foreground">Total global</dt>
              <dd className={`text-lg font-bold ${resultado.totalGlobal > 50_000_00 ? 'text-red-600' : 'text-green-600'}`}>
                {eur(resultado.totalGlobal)}
              </dd>
            </div>
          </dl>

          {/* Tabs */}
          <div className="flex flex-wrap gap-1 rounded-lg border p-1">
            {TABS.map(t => (
              <button key={t.key} type="button" onClick={() => setSeccion(t.key)}
                className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${seccion === t.key ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}>
                {t.label}{t.count > 0 && <span className="ml-1 text-xs opacity-70">({t.count})</span>}
              </button>
            ))}
          </div>

          {/* List — Cuentas */}
          {seccion === 'cuentas' && (
            <div className="space-y-3">
              {cuentas.map((c, i) => (
                <div key={i} className="flex items-center justify-between rounded-lg border p-3 text-sm">
                  <div>
                    <span className="font-medium">{c.entidad}</span>
                    <span className="text-muted-foreground ml-2">{c.pais}</span>
                    {c.iban && <span className="text-muted-foreground ml-2">IBAN: {c.iban}</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    <span>{eur(c.saldoFinalCents)}</span>
                    <span className="text-xs text-muted-foreground">Max: {eur(c.saldoMaximoCents)}</span>
                    <Button variant="ghost" size="sm" onClick={() => removeCuenta(i)}>✕</Button>
                  </div>
                </div>
              ))}
              <div className="rounded-lg border p-4 space-y-3">
                <p className="text-sm font-medium">Añadir cuenta bancaria</p>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <div className="space-y-1">
                    <LabelConAyuda htmlFor="cEntidad" ayuda={GUIA_MODELO_236.entidad}>Entidad</LabelConAyuda>
                    <Input id="cEntidad" value={cEntidad} onChange={e => setCEntidad(e.target.value)} placeholder="Deutsche Bank" />
                  </div>
                  <div className="space-y-1">
                    <LabelConAyuda htmlFor="cPais" ayuda={GUIA_MODELO_236.pais}>País</LabelConAyuda>
                    <select id="cPais" value={cPais} onChange={e => setCPais(e.target.value)} className={SELECT_CLS}>
                      <option value="">Seleccionar...</option>
                      {PAISES_COMUNES.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <LabelConAyuda htmlFor="cIban" ayuda={GUIA_MODELO_236.iban}>IBAN</LabelConAyuda>
                    <Input id="cIban" value={cIban} onChange={e => setCIban(e.target.value)} placeholder="DE89 3704 0044..." />
                  </div>
                  <div className="space-y-1">
                    <LabelConAyuda htmlFor="cSaldoFinal" ayuda={GUIA_MODELO_236.saldoFinal}>Saldo a 31/12 (€)</LabelConAyuda>
                    <Input id="cSaldoFinal" type="number" step="0.01" value={cSaldoFinal} onChange={e => setCSaldoFinal(e.target.value)} placeholder="0.00" />
                  </div>
                  <div className="space-y-1">
                    <LabelConAyuda htmlFor="cSaldoMaximo" ayuda={GUIA_MODELO_236.saldoMaximo}>Saldo máximo (€)</LabelConAyuda>
                    <Input id="cSaldoMaximo" type="number" step="0.01" value={cSaldoMaximo} onChange={e => setCSaldoMaximo(e.target.value)} placeholder="0.00" />
                  </div>
                  <div className="flex items-end">
                    <Button type="button" size="sm" onClick={addCuenta} disabled={!cEntidad || !cPais || !cSaldoFinal}>
                      <Plus className="mr-1 h-3 w-3" /> Añadir
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* List — Inmuebles */}
          {seccion === 'inmuebles' && (
            <div className="space-y-3">
              {inmuebles.map((im, i) => (
                <div key={i} className="flex items-center justify-between rounded-lg border p-3 text-sm">
                  <div>
                    <span className="font-medium">{im.direccion}</span>
                    <span className="text-muted-foreground ml-2">{im.pais}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>{eur(im.valorCents)}</span>
                    <Button variant="ghost" size="sm" onClick={() => removeInmueble(i)}>✕</Button>
                  </div>
                </div>
              ))}
              <div className="rounded-lg border p-4 space-y-3">
                <p className="text-sm font-medium">Añadir inmueble</p>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <div className="space-y-1">
                    <LabelConAyuda htmlFor="iDireccion" ayuda={GUIA_MODELO_236.direccion}>Dirección</LabelConAyuda>
                    <Input id="iDireccion" value={iDireccion} onChange={e => setIDireccion(e.target.value)} placeholder="15 Downing St, London" />
                  </div>
                  <div className="space-y-1">
                    <LabelConAyuda htmlFor="iPais" ayuda={GUIA_MODELO_236.pais}>País</LabelConAyuda>
                    <select id="iPais" value={iPais} onChange={e => setIPais(e.target.value)} className={SELECT_CLS}>
                      <option value="">Seleccionar...</option>
                      {PAISES_COMUNES.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <LabelConAyuda htmlFor="iValor" ayuda={GUIA_MODELO_236.valorInmueble}>Valor (€)</LabelConAyuda>
                    <Input id="iValor" type="number" step="0.01" value={iValor} onChange={e => setIValor(e.target.value)} placeholder="0.00" />
                  </div>
                  <div className="flex items-end">
                    <Button type="button" size="sm" onClick={addInmueble} disabled={!iDireccion || !iPais || !iValor}>
                      <Plus className="mr-1 h-3 w-3" /> Añadir
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* List — Valores */}
          {seccion === 'valores' && (
            <div className="space-y-3">
              {valores.map((v, i) => (
                <div key={i} className="flex items-center justify-between rounded-lg border p-3 text-sm">
                  <div>
                    <span className="font-medium">{v.entidad}</span>
                    <span className="text-muted-foreground ml-2">{v.pais}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>{eur(v.valorFinalCents)}</span>
                    <Button variant="ghost" size="sm" onClick={() => removeValor(i)}>✕</Button>
                  </div>
                </div>
              ))}
              <div className="rounded-lg border p-4 space-y-3">
                <p className="text-sm font-medium">Añadir valor</p>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <div className="space-y-1">
                    <LabelConAyuda htmlFor="vEntidad" ayuda={GUIA_MODELO_236.entidad}>Entidad</LabelConAyuda>
                    <Input id="vEntidad" value={vEntidad} onChange={e => setVEntidad(e.target.value)} placeholder="Interactive Brokers" />
                  </div>
                  <div className="space-y-1">
                    <LabelConAyuda htmlFor="vPais" ayuda={GUIA_MODELO_236.pais}>País</LabelConAyuda>
                    <select id="vPais" value={vPais} onChange={e => setVPais(e.target.value)} className={SELECT_CLS}>
                      <option value="">Seleccionar...</option>
                      {PAISES_COMUNES.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <LabelConAyuda htmlFor="vValor" ayuda={GUIA_MODELO_236.valorFinal}>Valor a 31/12 (€)</LabelConAyuda>
                    <Input id="vValor" type="number" step="0.01" value={vValor} onChange={e => setVValor(e.target.value)} placeholder="0.00" />
                  </div>
                  <div className="flex items-end">
                    <Button type="button" size="sm" onClick={addValor} disabled={!vEntidad || !vPais || !vValor}>
                      <Plus className="mr-1 h-3 w-3" /> Añadir
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* List — Seguros */}
          {seccion === 'seguros' && (
            <div className="space-y-3">
              {seguros.map((s, i) => (
                <div key={i} className="flex items-center justify-between rounded-lg border p-3 text-sm">
                  <div>
                    <span className="font-medium">{s.entidad}</span>
                    <span className="text-muted-foreground ml-2">{s.pais}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>{eur(s.capitalCents)}</span>
                    <Button variant="ghost" size="sm" onClick={() => removeSeguro(i)}>✕</Button>
                  </div>
                </div>
              ))}
              <div className="rounded-lg border p-4 space-y-3">
                <p className="text-sm font-medium">Añadir seguro</p>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <div className="space-y-1">
                    <LabelConAyuda htmlFor="sEntidad" ayuda={GUIA_MODELO_236.entidad}>Entidad aseguradora</LabelConAyuda>
                    <Input id="sEntidad" value={sEntidad} onChange={e => setSEntidad(e.target.value)} placeholder="Allianz" />
                  </div>
                  <div className="space-y-1">
                    <LabelConAyuda htmlFor="sPais" ayuda={GUIA_MODELO_236.pais}>País</LabelConAyuda>
                    <select id="sPais" value={sPais} onChange={e => setSPais(e.target.value)} className={SELECT_CLS}>
                      <option value="">Seleccionar...</option>
                      {PAISES_COMUNES.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <LabelConAyuda htmlFor="sCapital" ayuda={GUIA_MODELO_236.capital}>Capital (€)</LabelConAyuda>
                    <Input id="sCapital" type="number" step="0.01" value={sCapital} onChange={e => setSCapital(e.target.value)} placeholder="0.00" />
                  </div>
                  <div className="flex items-end">
                    <Button type="button" size="sm" onClick={addSeguro} disabled={!sEntidad || !sPais || !sCapital}>
                      <Plus className="mr-1 h-3 w-3" /> Añadir
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
