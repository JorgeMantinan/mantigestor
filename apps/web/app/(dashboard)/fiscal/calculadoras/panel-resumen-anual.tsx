'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Printer, AlertTriangle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { proximosPlazos } from '@mantigestor/utils'
import { eur, type DatosFiscales } from './types'
import { BotonPDF } from '@/components/boton-pdf'

interface ResumenAno {
  anyo: number
  numFacturas: number
  totalIngresos: number
  totalGastos: number
}

export function PanelResumenAnual({
  datos,
  comunidad,
}: {
  datos: DatosFiscales
  comunidad: string
}) {
  const minimos = datos.minimos.filter(m => m.territorio === comunidad)
  const minimosRef = minimos.length ? minimos : datos.minimos.filter(m => m.territorio.toLowerCase().includes('estatal'))
  // proximosPlazos normaliza fechas que llegan como string ISO vía JSON y descarta pasadas/inválidas
  const plazosProximos = proximosPlazos(datos.plazos, new Date(), 8)

  const [historial, setHistorial] = useState<ResumenAno[]>([])
  const [cargandoHistorial, setCargandoHistorial] = useState(true)

  const getSupabase = useCallback(() => createClient(), [])

  useEffect(() => {
    void (async () => {
      try {
        const supabase = getSupabase()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { setCargandoHistorial(false); return }

        const { data: facturas } = await supabase
          .from('facturas')
          .select('fechaEmision, tipo, baseImponible')
          .eq('perfilId', user.id)

        if (!facturas) { setCargandoHistorial(false); return }

        const porAno = new Map<number, { num: number; ingresos: number; gastos: number }>()
        for (const f of facturas) {
          const ano = new Date(f.fechaEmision).getFullYear()
          const existente = porAno.get(ano) ?? { num: 0, ingresos: 0, gastos: 0 }
          existente.num++
          if (f.tipo === 'ingreso') existente.ingresos += f.baseImponible
          else existente.gastos += f.baseImponible
          porAno.set(ano, existente)
        }

        const resumen: ResumenAno[] = [...porAno.entries()]
          .sort((a, b) => b[0] - a[0])
          .map(([anyo, d]) => ({
            anyo,
            numFacturas: d.num,
            totalIngresos: d.ingresos,
            totalGastos: d.gastos,
          }))
        setHistorial(resumen)
      } catch {
        // silently fail
      }
      setCargandoHistorial(false)
    })()
  }, [getSupabase])

  return (
    <div className="space-y-4">
      <div className="print:hidden flex gap-2">
        <Button variant="outline" onClick={() => window.print()}>
          <Printer className="mr-2 h-4 w-4" aria-hidden="true" />
          Imprimir resumen
        </Button>
        <BotonPDF elementId="resumen-fiscal" filename={`resumen-fiscal-${datos.taxYear}`} />
      </div>

      <div id="resumen-fiscal" className="print-area space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Resumen fiscal {comunidad} · ejercicio {datos.taxYear}</CardTitle>
            <CardDescription>
              Régimen {datos.regimen === 'COMUN' ? 'común' : 'foral'} · datos verificados contra fuentes oficiales
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5 text-sm">
            {datos.escalaEstatal && (
              <div>
                <p className="font-medium mb-1">Escala estatal</p>
                <table className="w-full max-w-md">
                  <tbody>
                    {datos.escalaEstatal.tramos.map(t => (
                      <tr key={t.tramo} className="border-b last:border-0">
                        <td className="py-1">
                          {eur(Math.round(t.desdeEur * 100))} – {t.hastaEur === null ? 'en adelante' : eur(Math.round(t.hastaEur * 100))}
                        </td>
                        <td className="py-1 text-right">{t.tipoPct.toLocaleString('es-ES')}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {datos.escalaAutonomica && (
              <div>
                <p className="font-medium mb-1">
                  {datos.escalaEstatal ? `Escala autonómica (${comunidad})` : `Escala íntegra ${comunidad} (régimen foral)`}
                </p>
                <table className="w-full max-w-md">
                  <tbody>
                    {datos.escalaAutonomica.tramos.map(t => (
                      <tr key={t.tramo} className="border-b last:border-0">
                        <td className="py-1">
                          {eur(Math.round(t.desdeEur * 100))} – {t.hastaEur === null ? 'en adelante' : eur(Math.round(t.hastaEur * 100))}
                        </td>
                        <td className="py-1 text-right">{t.tipoPct.toLocaleString('es-ES')}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div>
              <p className="font-medium mb-1">Mínimos personales y familiares ({minimos.length ? comunidad : 'referencia estatal'})</p>
              <ul className="space-y-0.5 text-muted-foreground">
                {minimosRef
                  .slice()
                  .sort((a, b) => b.importeEur - a.importeEur)
                  .map(m => (
                    <li key={`${m.concepto}`} className="flex justify-between gap-4 max-w-md">
                      <span>{m.concepto}</span>
                      <span>{m.importeEur.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</span>
                    </li>
                  ))}
              </ul>
            </div>

            <div>
              <p className="font-medium mb-1">Reducciones generales</p>
              <ul className="space-y-0.5 text-muted-foreground">
                {datos.reducciones.map(r => (
                  <li key={r.concepto}>
                    {r.concepto}
                    {r.formulaTexto ? `: ${r.formulaTexto}` : ''}
                  </li>
                ))}
              </ul>
            </div>

            {plazosProximos.length > 0 && (
              <div>
                <p className="font-medium mb-1">Próximos plazos</p>
                <ul className="space-y-0.5 text-muted-foreground">
                  {plazosProximos.map(p => (
                    <li key={p.id}>
                      {p.modeloNumero ?? 'Declaración'} · {p.periodo} →{' '}
                      {p.fechaLimiteReferencia.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <p className="text-xs text-muted-foreground pt-2 border-t">
              Documento orientativo generado por MantiGestor. No sustituye a la declaración oficial.
            </p>
          </CardContent>
        </Card>

        {/* Historical invoices by year */}
        {historial.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Facturas por año</CardTitle>
              <CardDescription>
                Resumen de facturas en todos los años con actividad
              </CardDescription>
            </CardHeader>
            <CardContent>
              {cargandoHistorial ? (
                <p className="text-sm text-muted-foreground">Cargando historial...</p>
              ) : (
                <div className="rounded-lg border overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="px-3 py-2 text-left font-medium">Año</th>
                        <th className="px-3 py-2 text-right font-medium">Facturas</th>
                        <th className="px-3 py-2 text-right font-medium">Ingresos</th>
                        <th className="px-3 py-2 text-right font-medium">Gastos</th>
                        <th className="px-3 py-2 text-right font-medium">Neto</th>
                      </tr>
                    </thead>
                    <tbody>
                      {historial.map(h => {
                        const neto = h.totalIngresos - h.totalGastos
                        const esAñoActual = h.anyo === datos.taxYear
                        return (
                          <tr key={h.anyo} className={`border-b last:border-0 ${esAñoActual ? 'bg-primary/5 font-medium' : ''}`}>
                            <td className="px-3 py-2">{h.anyo} {esAñoActual && '← ejercicio actual'}</td>
                            <td className="px-3 py-2 text-right">{h.numFacturas}</td>
                            <td className="px-3 py-2 text-right text-green-600">{eur(h.totalIngresos)}</td>
                            <td className="px-3 py-2 text-right text-red-600">{eur(h.totalGastos)}</td>
                            <td className={`px-3 py-2 text-right font-medium ${neto >= 0 ? 'text-green-600' : 'text-red-600'}`}>{eur(neto)}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
              {historial.some(h => h.anyo < datos.taxYear) && (
                <div className="mt-3 flex items-start gap-2 rounded-md border border-yellow-500/50 bg-yellow-500/10 p-3 text-sm">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-yellow-600" aria-hidden="true" />
                  <p>
                    Tienes facturas de años anteriores. Si no las declaraste, puedes seleccionar ese año en el ejercicio del IRPF para incluirlas.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
