'use client'

import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Landmark, Download, ExternalLink, Save, FileDown } from 'lucide-react'
import { generar100Automatico } from '@/lib/fiscal/auto-100'
import type { Resultado100Automatico } from '@/lib/fiscal/auto-100'
import { descargarCsv } from '@/lib/descargar-csv'
import { useLanguage } from '@/contexts/language-context'

export default function RentaPage() {
  const { t } = useLanguage()
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [resultado, setResultado] = useState<Resultado100Automatico | null>(null)
  const [perfilId, setPerfilId] = useState<string | null>(null)

  // Editable personal data
  const [situacionCivil, setSituacionCivil] = useState('soltero')
  const [fechaNacimiento, setFechaNacimiento] = useState('')
  const [numeroHijos, setNumeroHijos] = useState(0)
  const [hijosEdades, setHijosEdades] = useState('')
  const [tieneDiscapacidad, setTieneDiscapacidad] = useState(false)
  const [porcentajeDiscapacidad, setPorcentajeDiscapacidad] = useState(0)
  const [familiaNumerosa, setFamiliaNumerosa] = useState(false)
  const [planPensiones, setPlanPensiones] = useState(0)
  const [segurosDependencia, setSegurosDependencia] = useState(0)
  const [donaciones, setDonaciones] = useState(0)

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i)

  const calcular = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    const { data: perfil } = await supabase
      .from('perfiles')
      .select('id')
      .eq('userId', user.id)
      .single()

    if (!perfil) { setLoading(false); return }

    setPerfilId(perfil.id)

    const res = await generar100Automatico(perfil.id, selectedYear)
    if (res) {
      setResultado(res)
      setSituacionCivil(res.situacionCivil)
      setFechaNacimiento(res.fechaNacimiento?.split('T')[0] ?? '')
      setNumeroHijos(res.numeroHijos)
      setHijosEdades(res.hijosEdades.length > 0 ? JSON.stringify(res.hijosEdades) : '')
      setTieneDiscapacidad(res.tieneDiscapacidad)
      setPorcentajeDiscapacidad(res.porcentajeDiscapacidad)
      setFamiliaNumerosa(res.familiaNumerosa)
      setPlanPensiones(res.planPensiones)
      setSegurosDependencia(res.segurosDependencia)
      setDonaciones(res.donaciones)
    }
    setLoading(false)
  }, [selectedYear])

  const guardarDatos = useCallback(async () => {
    if (!perfilId) return
    setSaving(true)
    const supabase = createClient()
    const { error } = await supabase
      .from('perfiles')
      .update({
        situacionCivil,
        fechaNacimiento: fechaNacimiento || null,
        numeroHijos,
        hijosEdades: hijosEdades || null,
        tieneDiscapacidad,
        porcentajeDiscapacidad,
        familiaNumerosa,
        planPensiones,
        segurosDependencia,
        donaciones,
      })
      .eq('id', perfilId)

    if (!error) {
      await calcular()
    }
    setSaving(false)
  }, [perfilId, situacionCivil, fechaNacimiento, numeroHijos, hijosEdades,
    tieneDiscapacidad, porcentajeDiscapacidad, familiaNumerosa,
    planPensiones, segurosDependencia, donaciones, calcular])

  const formatMoney = (cents: number) =>
    new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(cents / 100)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-heading font-bold tracking-tight">{t('renta.titulo')}</h1>
        <p className="text-muted-foreground">
          {t('renta.subtitulo')}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {years.map((y) => (
          <Button
            key={y}
            variant={selectedYear === y ? 'secondary' : 'outline'}
            size="sm"
            onClick={() => setSelectedYear(y)}
          >
            {y}
          </Button>
        ))}
        <Button size="sm" onClick={calcular} disabled={loading} className="ml-auto">
          {loading ? t('renta.calculando') : t('renta.calcular')}
        </Button>
      </div>

      {resultado && (
        <>
          {/* Resumen cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{t('renta.rendimientosTrabajo')}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-green-600">{formatMoney(resultado.rendimientosTrabajo)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{t('renta.rendimientosActividades')}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{formatMoney(resultado.rendimientosActividades)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{t('renta.rendimientosAlquiler')}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{formatMoney(resultado.rendimientosAlquiler)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{t('renta.baseImponibleGeneral')}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{formatMoney(resultado.baseImponibleGeneral)}</p>
              </CardContent>
            </Card>
          </div>

          {/* Datos personales */}
          <Card>
            <CardHeader>
              <CardTitle>{t('renta.datosPersonales')}</CardTitle>
              <CardDescription>{t('renta.datosPersonalesDesc')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="situacionCivil">{t('renta.situacionCivil')}</Label>
                  <select
                    id="situacionCivil"
                    value={situacionCivil}
                    onChange={(e) => setSituacionCivil(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="soltero">{t('renta.soltero')}</option>
                    <option value="casado">{t('renta.casado')}</option>
                    <option value="divorciado">{t('renta.divorciado')}</option>
                    <option value="viudo">{t('renta.viudo')}</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fechaNacimiento">{t('renta.fechaNacimiento')}</Label>
                  <Input
                    id="fechaNacimiento"
                    type="date"
                    value={fechaNacimiento}
                    onChange={(e) => setFechaNacimiento(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="numeroHijos">{t('renta.numeroHijos')}</Label>
                  <Input
                    id="numeroHijos"
                    type="number"
                    min={0}
                    value={numeroHijos}
                    onChange={(e) => setNumeroHijos(Number(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="hijosEdades">{t('renta.hijosEdades')}</Label>
                  <Input
                    id="hijosEdades"
                    placeholder={t('renta.hijosEdadesPlaceholder')}
                    value={hijosEdades}
                    onChange={(e) => setHijosEdades(e.target.value)}
                  />
                </div>
                <div className="flex items-center gap-2 pt-6">
                  <input
                    id="tieneDiscapacidad"
                    type="checkbox"
                    checked={tieneDiscapacidad}
                    onChange={(e) => setTieneDiscapacidad(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <Label htmlFor="tieneDiscapacidad">{t('renta.tieneDiscapacidad')}</Label>
                </div>
                {tieneDiscapacidad && (
                  <div className="space-y-2">
                    <Label htmlFor="porcentajeDiscapacidad">{t('renta.porcentajeDiscapacidad')}</Label>
                    <Input
                      id="porcentajeDiscapacidad"
                      type="number"
                      min={0}
                      max={100}
                      value={porcentajeDiscapacidad}
                      onChange={(e) => setPorcentajeDiscapacidad(Number(e.target.value))}
                    />
                  </div>
                )}
                <div className="flex items-center gap-2 pt-6">
                  <input
                    id="familiaNumerosa"
                    type="checkbox"
                    checked={familiaNumerosa}
                    onChange={(e) => setFamiliaNumerosa(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <Label htmlFor="familiaNumerosa">{t('renta.familiaNumerosa')}</Label>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="planPensiones">{t('renta.planPensiones')} (€)</Label>
                  <Input
                    id="planPensiones"
                    type="number"
                    min={0}
                    value={planPensiones / 100}
                    onChange={(e) => setPlanPensiones(Math.round(Number(e.target.value) * 100))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="segurosDependencia">{t('renta.segurosDependencia')} (€)</Label>
                  <Input
                    id="segurosDependencia"
                    type="number"
                    min={0}
                    value={segurosDependencia / 100}
                    onChange={(e) => setSegurosDependencia(Math.round(Number(e.target.value) * 100))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="donaciones">{t('renta.donacionesDeducibles')} (€)</Label>
                  <Input
                    id="donaciones"
                    type="number"
                    min={0}
                    value={donaciones / 100}
                    onChange={(e) => setDonaciones(Math.round(Number(e.target.value) * 100))}
                  />
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <Button onClick={guardarDatos} disabled={saving}>
                  <Save className="mr-2 h-4 w-4" />
                  {saving ? t('renta.guardando') : t('renta.guardarDatos')}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Resultado Modelo 100 */}
          <Card>
            <CardHeader>
              <CardTitle>{t('renta.resultadoIrpf').replace('{year}', String(selectedYear))}</CardTitle>
              <CardDescription>
                {t('renta.calculoOrientativo')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-3">
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-sm text-muted-foreground">{t('renta.rendimientosTrabajo')}</span>
                    <span className="font-medium">{formatMoney(resultado.rendimientosTrabajo)}</span>
                  </div>
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-sm text-muted-foreground">{t('renta.rendimientosActividades')}</span>
                    <span className="font-medium">{formatMoney(resultado.rendimientosActividades)}</span>
                  </div>
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-sm text-muted-foreground">{t('renta.rendimientosAlquiler')}</span>
                    <span className="font-medium">{formatMoney(resultado.rendimientosAlquiler)}</span>
                  </div>
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-sm font-medium">{t('renta.baseImponibleGeneral')}</span>
                    <span className="font-bold">{formatMoney(resultado.baseImponibleGeneral)}</span>
                  </div>
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-sm text-muted-foreground">{t('renta.reduccionTrabajo')}</span>
                    <span className="font-medium text-green-600">-{formatMoney(resultado.reduccionTrabajo)}</span>
                  </div>
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-sm font-medium">{t('renta.baseLiquidableGeneral')}</span>
                    <span className="font-bold">{formatMoney(resultado.baseLiquidableGeneral)}</span>
                  </div>
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-sm text-muted-foreground">{t('renta.minimoPersonalFamiliar')}</span>
                    <span className="font-medium">{formatMoney(resultado.minimoPersonalFamiliar)}</span>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-sm font-medium">{t('renta.cuotaIntegra')}</span>
                    <span className="font-bold text-lg">{formatMoney(resultado.resultado.cuotaIntegra)}</span>
                  </div>
                  {resultado.resultado.cuotaAhorro > 0 && (
                    <div className="flex justify-between border-b pb-2">
                      <span className="text-sm text-muted-foreground">{t('renta.cuotaIntegra')} ahorro</span>
                      <span className="font-medium">{formatMoney(resultado.resultado.cuotaAhorro)}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-sm text-muted-foreground">{t('renta.retencionesNomina')}</span>
                    <span className="font-medium text-green-600">{formatMoney(resultado.retencionesIRPF)}</span>
                  </div>
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-sm font-medium">{t('renta.cuotaLiquida')}</span>
                    <span className="font-bold">{formatMoney(resultado.resultado.cuotaLiquida)}</span>
                  </div>
                  <div className="flex items-center justify-between pt-2">
                    <div>
                      <p className="font-medium">{t('renta.resultadoAIngresar')}</p>
                    </div>
                    <span className={`text-2xl font-bold ${resultado.resultado.aPagar > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {resultado.resultado.aPagar > 0
                        ? formatMoney(resultado.resultado.aPagar)
                        : resultado.resultado.aDevolver > 0
                          ? formatMoney(resultado.resultado.aDevolver)
                          : '0 €'}
                      <span className="text-sm font-normal text-muted-foreground ml-1">
                        {resultado.resultado.aPagar > 0 ? t('renta.aPagar') : resultado.resultado.aDevolver > 0 ? t('renta.aDevolver') : t('renta.sinImporte')}
                      </span>
                    </span>
                  </div>
                </div>
              </div>
              <div className="pt-4 flex gap-2">
                <Button variant="outline" className="flex-1"
                  onClick={() => {
                    if (!resultado) return
                    const filas: string[][] = [
                      [t('renta.concepto'), t('renta.importeEur')],
                      [t('renta.rendimientosTrabajo'), (resultado.rendimientosTrabajo / 100).toFixed(2)],
                      [t('renta.rendimientosActividades'), (resultado.rendimientosActividades / 100).toFixed(2)],
                      [t('renta.rendimientosAlquiler'), (resultado.rendimientosAlquiler / 100).toFixed(2)],
                      [t('renta.baseImponibleGeneral'), (resultado.baseImponibleGeneral / 100).toFixed(2)],
                      [t('renta.reduccionTrabajo'), (resultado.reduccionTrabajo / 100).toFixed(2)],
                      [t('renta.baseLiquidableGeneral'), (resultado.baseLiquidableGeneral / 100).toFixed(2)],
                      [t('renta.minimoPersonalFamiliar'), (resultado.minimoPersonalFamiliar / 100).toFixed(2)],
                      [t('renta.cuotaIntegra'), (resultado.resultado.cuotaIntegra / 100).toFixed(2)],
                      [t('renta.retencionesNomina'), (resultado.retencionesIRPF / 100).toFixed(2)],
                      [t('renta.cuotaLiquida'), (resultado.resultado.cuotaLiquida / 100).toFixed(2)],
                      [t('renta.resultadoFinal'), ((resultado.resultado.aPagar - resultado.resultado.aDevolver) / 100).toFixed(2)],
                    ]
                    descargarCsv(filas, `renta-modelo100-${selectedYear}.csv`)
                  }}>
                  <Download className="mr-2 h-4 w-4" />
                  {t('renta.exportarResumen')}
                </Button>
                <Button variant="outline" className="flex-1" asChild>
                  <a
                    href="https://sede.agenciatributaria.gob.es/Sede/irpf/campana-renta.html"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="mr-2 h-4 w-4" />
                    {t('renta.agenciaTributaria')}
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {!resultado && (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-12">
            <Landmark className="h-12 w-12 text-muted-foreground" />
            <div className="text-center">
              <p className="font-medium">{t('renta.seleccionaAnoFiscal')}</p>
              <p className="text-sm text-muted-foreground">
                {t('renta.eligeAnoYCalcular')}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
