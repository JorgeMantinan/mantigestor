'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Printer } from 'lucide-react'
import { eur, type DatosFiscales } from './types'

export function PanelResumenAnual({
  datos,
  comunidad,
}: {
  datos: DatosFiscales
  comunidad: string
}) {
  const minimos = datos.minimos.filter(m => m.territorio === comunidad)
  const minimosRef = minimos.length ? minimos : datos.minimos.filter(m => m.territorio.toLowerCase().includes('estatal'))
  const plazosProximos = datos.plazos
    .filter((p): p is typeof p & { fechaLimiteReferencia: Date } => p.fechaLimiteReferencia !== null)
    .filter(p => p.fechaLimiteReferencia.getTime() >= Date.now())
    .sort((a, b) => a.fechaLimiteReferencia.getTime() - b.fechaLimiteReferencia.getTime())
    .slice(0, 8)

  return (
    <div className="space-y-4">
      <div className="print:hidden">
        <Button variant="outline" onClick={() => window.print()}>
          <Printer className="mr-2 h-4 w-4" aria-hidden="true" />
          Imprimir resumen
        </Button>
      </div>

      <div className="print-area space-y-4">
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
      </div>
    </div>
  )
}
