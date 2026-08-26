'use client'

import { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { calcularCuotaEscala, type EscalaIrpf } from '@mantigestor/utils'
import { eur, parseEuros, type DatosFiscales } from './types'
import { LabelConAyuda } from './label-con-ayuda'
import { GUIA_PATRIMONIO } from '@/lib/fiscal/guia-fiscal'

export function CalculadoraPatrimonio({ datos }: { datos: DatosFiscales }) {
  const [patrimonio, setPatrimonio] = useState('')

  const resultado = useMemo(() => {
    const cantidad = parseEuros(patrimonio)
    if (cantidad === null) return null

    const escalaActiva = datos.escalaPatrimonioAutonomica ?? datos.escalaPatrimonioEstatal
    if (!escalaActiva.length) return null

    const ambito = datos.escalaPatrimonioAutonomica ? 'AUTONOMICO' : 'ESTATAL'
    try {
      return calcularCuotaEscala(Math.round(cantidad * 100), {
        ambito,
        comunidad: datos.comunidadPatrimonio,
        taxYear: datos.taxYear,
        tramos: escalaActiva,
      } as EscalaIrpf)
    } catch {
      return null
    }
  }, [patrimonio, datos.escalaPatrimonioEstatal, datos.escalaPatrimonioAutonomica, datos.comunidadPatrimonio, datos.taxYear])

  const bonificacion = datos.bonificacionesPatrimonio[0] ?? null
  const cuotaConBonificacion = useMemo(() => {
    if (!resultado || !bonificacion || bonificacion.porcentajeCents === 0) return null
    const reduccion = Math.round(resultado.cuotaTotalCentimos * (bonificacion.porcentajeCents / 10000))
    const maxBonif = bonificacion.importeMaxCents ?? Infinity
    const bonifReal = Math.min(reduccion, maxBonif)
    return Math.max(0, resultado.cuotaTotalCentimos - bonifReal)
  }, [resultado, bonificacion])

  const tieneEscalaPropia = datos.escalaPatrimonioAutonomica !== null

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          Impuesto sobre el Patrimonio · {tieneEscalaPropia ? `escala ${datos.comunidadPatrimonio}` : 'escala estatal'} {datos.taxYear}
        </CardTitle>
        <CardDescription>
          {tieneEscalaPropia
            ? `Escala propia de ${datos.comunidadPatrimonio} aplicada.`
            : 'Escala estatal (art. 30 Ley 19/1991).'}
          {' '}{bonificacion && bonificacion.porcentajeCents > 0
            ? `Bonificación: ${bonificacion.descripcion}.`
            : bonificacion && bonificacion.porcentajeCents === 0
              ? `${datos.comunidadPatrimonio}: ${bonificacion.descripcion}.`
              : ''}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="max-w-xs space-y-2">
          <LabelConAyuda htmlFor="patrimonio-neto" ayuda={GUIA_PATRIMONIO.patrimonioNeto!}>Patrimonio neto (€)</LabelConAyuda>
          <Input
            id="patrimonio-neto"
            type="number"
            min="0"
            step="0.01"
            placeholder="2000000"
            value={patrimonio}
            onChange={e => setPatrimonio(e.target.value)}
          />
        </div>

        {resultado && (
          <>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Cuota {tieneEscalaPropia ? 'escala autonómica' : 'escala estatal'}</p>
                <p className="text-lg font-semibold">{eur(resultado.cuotaTotalCentimos)}</p>
                <p className="text-xs text-muted-foreground">Tipo medio {resultado.tipoMedioPct}%</p>
              </div>
              {cuotaConBonificacion !== null && (
                <div className="rounded-lg border border-primary/50 bg-primary/5 p-3">
                  <p className="text-xs text-muted-foreground">Cuota tras bonificación</p>
                  <p className="text-lg font-bold text-primary">{eur(cuotaConBonificacion)}</p>
                  <p className="text-xs text-muted-foreground">{bonificacion!.descripcion}</p>
                </div>
              )}
              {bonificacion && bonificacion.porcentajeCents > 0 && cuotaConBonificacion !== null && (
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Ahorro por bonificación</p>
                  <p className="text-lg font-semibold text-green-600">{eur(resultado.cuotaTotalCentimos - cuotaConBonificacion)}</p>
                </div>
              )}
            </div>

            {bonificacion && bonificacion.condiciones && (
              <p className="text-xs text-muted-foreground">Condiciones: {bonificacion.condiciones}</p>
            )}

            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground border-b">
                  <th className="py-1 font-normal">Tramo</th>
                  <th className="py-1 font-normal">Base gravada</th>
                  <th className="py-1 font-normal">Tipo</th>
                  <th className="py-1 font-normal text-right">Cuota</th>
                </tr>
              </thead>
              <tbody>
                {resultado.detalle.map(t => (
                  <tr key={t.tramo} className="border-b last:border-0">
                    <td className="py-1">{t.tramo}</td>
                    <td className="py-1">{eur(t.baseTramoCentimos)}</td>
                    <td className="py-1">{t.tipoPct.toLocaleString('es-ES')}%</td>
                    <td className="py-1 text-right">{eur(t.cuotaTramoCentimos)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {datos.escalaPatrimonioEstatal.length > 0 && (
              <details className="rounded-md border">
                <summary className="cursor-pointer px-3 py-2 text-sm font-medium">Ver escala estatal de referencia</summary>
                <table className="w-full text-sm px-3 pb-3">
                  <thead>
                    <tr className="text-left text-muted-foreground border-b">
                      <th className="py-1 font-normal">Desde</th>
                      <th className="py-1 font-normal">Hasta</th>
                      <th className="py-1 font-normal text-right">Tipo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {datos.escalaPatrimonioEstatal.map(t => (
                      <tr key={t.tramo} className="border-b last:border-0">
                        <td className="py-1">{eur(t.desdeEur * 100)}</td>
                        <td className="py-1">{t.hastaEur === null ? 'En adelante' : eur(t.hastaEur * 100)}</td>
                        <td className="py-1 text-right">{t.tipoPct.toLocaleString('es-ES')}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </details>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
