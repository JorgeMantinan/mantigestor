'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { usePersonaActiva } from '@/contexts/persona-activa-context'
import { FileText, Download, Calendar, AlertTriangle, CheckCircle, BarChart3 } from 'lucide-react'
import { formatoMoneda } from '@/lib/divisas'
import {
  generarDatosInforme,
  generarCSVInforme,
  type DatosInformeCliente,
} from '@/lib/informe-cliente'
import { SELECT_CLS } from '@/lib/ui-constants'

export default function InformesClientesPage() {
  const { personas } = usePersonaActiva()
  const [clienteSeleccionado, setClienteSeleccionado] = useState<string>('')
  const [periodo, setPeriodo] = useState<'trimestre' | 'anual'>('anual')
  const [trimestre, setTrimestre] = useState(1)
  const [anyo, setAnyo] = useState(new Date().getFullYear())
  const [datos, setDatos] = useState<DatosInformeCliente | null>(null)
  const [loading, setLoading] = useState(false)
  const [generando, setGenerando] = useState(false)

  const clientesGestionados = personas.filter(p => p.tipo === 'gestiono')

  const generarInforme = useCallback(async () => {
    if (!clienteSeleccionado) return
    setLoading(true)
    setDatos(null)
    try {
      const resultado = await generarDatosInforme(
        clienteSeleccionado,
        anyo,
        periodo === 'trimestre' ? trimestre : undefined
      )
      setDatos(resultado)
    } catch {
      // Silenciar errores
    } finally {
      setLoading(false)
    }
  }, [clienteSeleccionado, anyo, periodo, trimestre])

  useEffect(() => {
    if (clienteSeleccionado) {
      void generarInforme()
    }
  }, [clienteSeleccionado, generarInforme])

  const descargarCSV = () => {
    if (!datos) return
    const csv = generarCSVInforme(datos)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `informe-${datos.nombre.replace(/\s+/g, '-').toLowerCase()}-${datos.periodo}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const descargarPDF = async () => {
    if (!datos) return
    setGenerando(true)
    try {
      const { jsPDF } = await import('jspdf')
      const doc = new jsPDF()
      const ancho = doc.internal.pageSize.getWidth()
      let y = 20

      // Header
      doc.setFillColor(245, 245, 245)
      doc.rect(0, 0, ancho, 40, 'F')
      doc.setFontSize(20)
      doc.setTextColor(33, 33, 33)
      doc.text('MantiGestor - Informe Fiscal', 14, y)
      y += 10
      doc.setFontSize(11)
      doc.setTextColor(100, 100, 100)
      doc.text(`Cliente: ${datos.nombre} | NIF: ${datos.nif ?? 'N/A'} | Periodo: ${datos.periodo}`, 14, y)
      y += 8
      doc.text(`Generado: ${datos.fechaGeneracion}`, 14, y)
      y += 15

      // Resumen
      doc.setFontSize(14)
      doc.setTextColor(33, 33, 33)
      doc.text('Resumen Financiero', 14, y)
      y += 8

      const resumenItems: Array<[string, string]> = [
        ['Ingresos totales', formatoMoneda(datos.resumen.ingresosTotales / 100, 'EUR')],
        ['Gastos totales', formatoMoneda(datos.resumen.gastosTotales / 100, 'EUR')],
        ['Beneficio neto', formatoMoneda(datos.resumen.beneficioNeto / 100, 'EUR')],
        ['IVA devengado', formatoMoneda(datos.resumen.ivaDevengado / 100, 'EUR')],
        ['IVA soportado', formatoMoneda(datos.resumen.ivaSoportado / 100, 'EUR')],
        ['IVA liquidado', formatoMoneda(datos.resumen.ivaLiquidado / 100, 'EUR')],
      ]

      doc.setFontSize(10)
      for (const [label, valor] of resumenItems) {
        doc.setTextColor(100, 100, 100)
        doc.text(label, 14, y)
        doc.setTextColor(33, 33, 33)
        doc.text(valor, 120, y)
        y += 6
      }
      y += 8

      // Modelos pendientes
      if (datos.modelosPendientes.length > 0) {
        doc.setFontSize(14)
        doc.setTextColor(33, 33, 33)
        doc.text('Modelos Pendientes', 14, y)
        y += 8
        doc.setFontSize(10)
        for (const m of datos.modelosPendientes) {
          doc.setTextColor(180, 60, 60)
          doc.text(`Modelo ${m.modelo} - ${m.nombre}`, 14, y)
          doc.setTextColor(100, 100, 100)
          doc.text(`Plazo: ${m.plazoMaximo}`, 120, y)
          y += 6
        }
        y += 8
      }

      // Calendario fiscal
      if (datos.calendarioFiscal.length > 0) {
        doc.setFontSize(14)
        doc.setTextColor(33, 33, 33)
        doc.text('Calendario Fiscal', 14, y)
        y += 8
        doc.setFontSize(10)
        for (const c of datos.calendarioFiscal) {
          doc.setTextColor(100, 100, 100)
          doc.text(c.fecha, 14, y)
          doc.setTextColor(33, 33, 33)
          doc.text(c.descripcion, 50, y)
          doc.setTextColor(60, 130, 60)
          doc.text(`${c.diasRestantes} días`, 160, y)
          y += 6
        }
        y += 8
      }

      // Desglose gastos
      if (datos.desgloseGastos.length > 0) {
        doc.setFontSize(14)
        doc.setTextColor(33, 33, 33)
        doc.text('Desglose de Gastos', 14, y)
        y += 8
        doc.setFontSize(10)
        for (const g of datos.desgloseGastos) {
          doc.setTextColor(100, 100, 100)
          doc.text(g.categoria, 14, y)
          doc.setTextColor(33, 33, 33)
          doc.text(formatoMoneda(g.importe / 100, 'EUR'), 120, y)
          doc.text(`${g.porcentaje}%`, 160, y)
          y += 6
        }
        y += 8
      }

      // Recomendaciones
      if (datos.recomendaciones.length > 0) {
        doc.setFontSize(14)
        doc.setTextColor(33, 33, 33)
        doc.text('Recomendaciones', 14, y)
        y += 8
        doc.setFontSize(10)
        for (const r of datos.recomendaciones) {
          doc.setTextColor(60, 130, 60)
          doc.text(`• ${r}`, 14, y, { maxWidth: ancho - 28 })
          y += Math.ceil(r.length / 80) * 5 + 3
        }
      }

      // Footer
      const pageCount = doc.getNumberOfPages()
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i)
        doc.setFontSize(8)
        doc.setTextColor(150, 150, 150)
        doc.text(
          `MantiGestor — Informe generado el ${datos.fechaGeneracion} — Página ${i}/${pageCount}`,
          ancho / 2,
          doc.internal.pageSize.getHeight() - 10,
          { align: 'center' }
        )
      }

      doc.save(`informe-${datos.nombre.replace(/\s+/g, '-').toLowerCase()}-${datos.periodo}.pdf`)
    } catch (error) {
      console.error('Error generando PDF:', error)
    } finally {
      setGenerando(false)
    }
  }

  const anhoActual = new Date().getFullYear()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-heading font-bold tracking-tight">Informes de Cliente</h1>
        <p className="text-muted-foreground">Genera informes fiscales profesionales para tus clientes</p>
      </div>

      {clientesGestionados.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-12">
            <FileText className="h-12 w-12 text-muted-foreground" />
            <div className="text-center">
              <p className="font-medium">No tienes clientes para generar informes</p>
              <p className="text-sm text-muted-foreground">
                Asocia personas desde Ajustes &gt; Personas para generar informes.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Panel de configuración */}
          <div className="lg:col-span-1 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Configurar informe</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Cliente</label>
                  <select
                    value={clienteSeleccionado}
                    onChange={e => setClienteSeleccionado(e.target.value)}
                    className={SELECT_CLS}
                  >
                    <option value="">Seleccionar cliente...</option>
                    {clientesGestionados.map(p => (
                      <option key={p.perfilId} value={p.perfilId}>
                        {p.nombre || p.email}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Periodo</label>
                  <select
                    value={periodo}
                    onChange={e => setPeriodo(e.target.value as 'trimestre' | 'anual')}
                    className={SELECT_CLS}
                  >
                    <option value="anual">Anual</option>
                    <option value="trimestre">Trimestral</option>
                  </select>
                </div>

                {periodo === 'trimestre' && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Trimestre</label>
                    <select
                      value={trimestre}
                      onChange={e => setTrimestre(Number(e.target.value))}
                      className={SELECT_CLS}
                    >
                      <option value={1}>1er Trimestre (Ene-Mar)</option>
                      <option value={2}>2º Trimestre (Abr-Jun)</option>
                      <option value={3}>3er Trimestre (Jul-Sep)</option>
                      <option value={4}>4º Trimestre (Oct-Dic)</option>
                    </select>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-sm font-medium">Año</label>
                  <select
                    value={anyo}
                    onChange={e => setAnyo(Number(e.target.value))}
                    className={SELECT_CLS}
                  >
                    {[anhoActual - 1, anhoActual].map(a => (
                      <option key={a} value={a}>{a}</option>
                    ))}
                  </select>
                </div>

                {datos && (
                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={descargarCSV}
                    >
                      <Download className="h-4 w-4 mr-1" aria-hidden="true" />
                      CSV
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => void descargarPDF()}
                      disabled={generando}
                    >
                      <Download className="h-4 w-4 mr-1" aria-hidden="true" />
                      {generando ? 'Generando...' : 'PDF'}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Vista previa del informe */}
          <div className="lg:col-span-2">
            {!clienteSeleccionado ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  Selecciona un cliente para generar el informe.
                </CardContent>
              </Card>
            ) : loading ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  Generando informe...
                </CardContent>
              </Card>
            ) : datos ? (
              <div className="space-y-4">
                {/* Header del informe */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg">
                          Informe Fiscal — {datos.nombre}
                        </CardTitle>
                        <CardDescription>
                          NIF: {datos.nif ?? 'N/A'} · {datos.periodo} · Generado: {datos.fechaGeneracion}
                        </CardDescription>
                      </div>
                      <Badge variant="outline">
                        <Calendar className="h-3 w-3 mr-1" aria-hidden="true" />
                        {datos.periodo}
                      </Badge>
                    </div>
                  </CardHeader>
                </Card>

                {/* Resumen financiero */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Resumen Financiero</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                      <div>
                        <p className="text-xs text-muted-foreground">Ingresos</p>
                        <p className="text-lg font-bold text-green-600">
                          {formatoMoneda(datos.resumen.ingresosTotales / 100, 'EUR')}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Gastos</p>
                        <p className="text-lg font-bold text-red-600">
                          {formatoMoneda(datos.resumen.gastosTotales / 100, 'EUR')}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Beneficio neto</p>
                        <p className={`text-lg font-bold ${datos.resumen.beneficioNeto >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {formatoMoneda(datos.resumen.beneficioNeto / 100, 'EUR')}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">IVA devengado</p>
                        <p className="text-sm font-medium">{formatoMoneda(datos.resumen.ivaDevengado / 100, 'EUR')}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">IVA soportado</p>
                        <p className="text-sm font-medium">{formatoMoneda(datos.resumen.ivaSoportado / 100, 'EUR')}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">IVA a liquidar</p>
                        <p className={`text-sm font-bold ${datos.resumen.ivaLiquidado >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {formatoMoneda(datos.resumen.ivaLiquidado / 100, 'EUR')}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Modelos pendientes */}
                {datos.modelosPendientes.length > 0 && (
                  <Card className="border-yellow-500/50">
                    <CardHeader>
                      <CardTitle className="text-sm flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-yellow-600" aria-hidden="true" />
                        Modelos Pendientes ({datos.modelosPendientes.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {datos.modelosPendientes.map(m => (
                        <div key={m.modelo} className="flex items-center justify-between rounded border p-2 text-sm">
                          <div>
                            <span className="font-mono font-bold">Modelo {m.modelo}</span>
                            <span className="ml-2 text-muted-foreground">{m.nombre}</span>
                          </div>
                          <div className="text-right">
                            <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                              {m.estado}
                            </Badge>
                            <p className="text-xs text-muted-foreground mt-0.5">Plazo: {m.plazoMaximo}</p>
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {/* Calendario fiscal */}
                {datos.calendarioFiscal.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Calendario Fiscal</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {datos.calendarioFiscal.map((c, i) => (
                        <div key={i} className="flex items-center justify-between text-sm py-1 border-b last:border-0">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-3 w-3 text-muted-foreground" aria-hidden="true" />
                            <span>{c.descripcion}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-muted-foreground">{c.fecha}</span>
                            <Badge
                              variant="outline"
                              className={`ml-2 text-xs ${c.diasRestantes <= 30 ? 'text-yellow-600' : 'text-green-600'}`}
                            >
                              {c.diasRestantes} días
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {/* Desglose de gastos */}
                {datos.desgloseGastos.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm flex items-center gap-2">
                        <BarChart3 className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                        Desglose de Gastos
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {datos.desgloseGastos.map(g => (
                        <div key={g.categoria} className="flex items-center justify-between text-sm">
                          <span>{g.categoria}</span>
                          <div className="flex items-center gap-3">
                            <div className="w-24 h-2 rounded-full bg-muted overflow-hidden">
                              <div
                                className="h-full bg-primary rounded-full"
                                style={{ width: `${g.porcentaje}%` }}
                              />
                            </div>
                            <span className="w-12 text-right text-muted-foreground">{g.porcentaje}%</span>
                            <span className="w-24 text-right font-medium">{formatoMoneda(g.importe / 100, 'EUR')}</span>
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {/* Recomendaciones */}
                {datos.recomendaciones.length > 0 && (
                  <Card className="border-green-500/50">
                    <CardHeader>
                      <CardTitle className="text-sm flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600" aria-hidden="true" />
                        Recomendaciones
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {datos.recomendaciones.map((r, i) => (
                        <div key={i} className="flex items-start gap-2 text-sm">
                          <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 shrink-0" aria-hidden="true" />
                          <span>{r}</span>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  )
}
