'use client'

import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Landmark, Download, ExternalLink } from 'lucide-react'
import { calcularModelo130 } from '@mantigestor/utils'
import type { Factura as FacturaType } from '@mantigestor/types'
import { descargarCsv } from '@/lib/descargar-csv'
import { useLanguage } from '@/contexts/language-context'

export default function RentaPage() {
  const { t } = useLanguage()
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [loading, setLoading] = useState(false)
  const [resultado, setResultado] = useState<ReturnType<typeof calcularModelo130> | null>(null)
  const getSupabase = useCallback(() => createClient(), [])

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i)

  const calcular = useCallback(async () => {
    setLoading(true)
    const supabase = getSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    // Fetch facturas del año
    const { data: facturas } = await supabase
      .from('facturas')
      .select('*')
      .eq('perfilId', user.id)
      .gte('fechaEmision', `${selectedYear}-01-01`)
      .lt('fechaEmision', `${selectedYear + 1}-01-01`)

    // Fetch retenciones IRPF de nóminas donde el usuario es la empleada
    const { data: nominasEmp } = await supabase
      .from('nominas')
      .select('salarioBruto, irpf')
      .eq('perfilId', user.id)
      .eq('rol', 'empleado')
      .eq('anyo', selectedYear)

    // Fetch gastos de alquiler deducibles del año
    const { data: propiedades } = await supabase
      .from('propiedades_alquiler')
      .select('id')
      .eq('perfilId', user.id)

    let gastosAlquiler = 0
    if (propiedades && propiedades.length > 0) {
      const ids = propiedades.map(p => p.id)
      const { data: gastos } = await supabase
        .from('gastos_alquiler')
        .select('importe')
        .in('propiedadId', ids)
        .gte('fecha', `${selectedYear}-01-01`)
        .lt('fecha', `${selectedYear + 1}-01-01`)

      if (gastos) gastosAlquiler = gastos.reduce((s, g) => s + (g.importe ?? 0), 0)
    }

    if (facturas) {
      const tipadas = facturas as unknown as FacturaType[]
      const ingresos = tipadas.filter(f => f.tipo === 'ingreso').reduce((s, f) => s + f.importe, 0)
      const gastos = tipadas.filter(f => f.tipo === 'gasto').reduce((s, f) => s + f.importe, 0)

      // Retenciones IRPF de nóminas como empleada: sumamos retenciones mensuales
      const retencionesNomina = nominasEmp
        ? nominasEmp.reduce((s, n) => s + Math.round(n.salarioBruto * (n.irpf / 100)), 0)
        : 0

      const res = calcularModelo130(ingresos, gastos + gastosAlquiler, 0, retencionesNomina)
      setResultado(res)
    }
    setLoading(false)
  }, [selectedYear, getSupabase])

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
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{t('renta.ingresos')}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-green-600">{formatMoney(resultado.ingresosAcumuladosAño)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{t('renta.gastosDeducibles')}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-red-600">{formatMoney(resultado.gastosDeduciblesAcumulados)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{t('renta.rendimientoNeto')}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{formatMoney(resultado.rendimientoNeto)}</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>{t('renta.resultadoIrpf').replace('{year}', String(selectedYear))}</CardTitle>
              <CardDescription>
                {t('renta.calculoOrientativo')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between border-b pb-4">
                <div>
                  <p className="font-medium">{t('renta.cuotaIntegra')}</p>
                  <p className="text-sm text-muted-foreground">{t('renta.porcentajeSobreRendimiento').replace('{porcentaje}', String(resultado.porcentajeRetencion))}</p>
                </div>
                <span className="text-2xl font-bold">{formatMoney(resultado.cuotaIntegra)}</span>
              </div>
              <div className="flex items-center justify-between border-b pb-4">
                <div>
                  <p className="font-medium">{t('renta.retencionesNomina')}</p>
                  <p className="text-sm text-muted-foreground">{t('renta.irpfRetenidoPorPagadores')}</p>
                </div>
                <span className="text-2xl font-bold text-green-600">{formatMoney(resultado.retencionesNomina)}</span>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{t('renta.resultadoAIngresar')}</p>
                  <p className="text-sm text-muted-foreground">{t('renta.declaracionRentaAnual')}</p>
                </div>
                <span className={`text-2xl font-bold ${resultado.aIngresar > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {resultado.aIngresar > 0 ? formatMoney(resultado.aIngresar) : '0 €'}
                  <span className="text-sm font-normal text-muted-foreground ml-1">
                    {resultado.aIngresar > 0 ? t('renta.aPagar') : t('renta.sinImporte')}
                  </span>
                </span>
              </div>
              {resultado.sinActividad && (
                <p className="text-sm text-muted-foreground mt-2">
                  {t('renta.sinActividad')}
                </p>
              )}
              <div className="pt-4 flex gap-2">
                <Button variant="outline" className="flex-1" disabled={!resultado}
                  onClick={() => {
                    if (!resultado) return
                    const filas: string[][] = [
                      [t('renta.concepto'), t('renta.importeEur')],
                      [t('renta.ingresosAcumulados'), (resultado.ingresosAcumuladosAño / 100).toFixed(2)],
                      [t('renta.gastosDeduciblesCsv'), (resultado.gastosDeduciblesAcumulados / 100).toFixed(2)],
                      [t('renta.rendimientoNetoCsv'), (resultado.rendimientoNeto / 100).toFixed(2)],
                      [t('renta.cuotaIntegraCsv'), (resultado.cuotaIntegra / 100).toFixed(2)],
                      [t('renta.pagosAnteriores'), (resultado.pagosAnterioresAño / 100).toFixed(2)],
                      [t('renta.retencionesNominasCsv'), (resultado.retencionesNomina / 100).toFixed(2)],
                      [t('renta.resultadoFinal'), (resultado.resultadoFinal / 100).toFixed(2)],
                      [t('renta.aIngresarCsv'), (resultado.aIngresar / 100).toFixed(2)]
                    ]
                    descargarCsv(filas, `renta-modelo130-${selectedYear}.csv`)
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
