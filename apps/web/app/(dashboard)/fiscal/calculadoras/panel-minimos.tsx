'use client'

import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import type { DatosFiscales } from './types'

export function PanelMinimos({ datos, comunidad }: { datos: DatosFiscales; comunidad: string }) {
  const minimosFiltrados = useMemo(
    () => datos.minimos.filter(m => m.territorio === 'Estatal' || m.territorio === comunidad),
    [datos.minimos, comunidad]
  )

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Mínimo personal y familiar {datos.taxYear}</CardTitle>
          <CardDescription>
            Valores estatales y de {comunidad}. Los mínimos reducen la base liquidable antes de aplicar la escala.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {minimosFiltrados.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay mínimos registrados para este territorio.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground border-b">
                  <th className="py-1 font-normal">Concepto</th>
                  <th className="py-1 font-normal text-right">Importe</th>
                  <th className="py-1 font-normal">Notas</th>
                </tr>
              </thead>
              <tbody>
                {minimosFiltrados.map((m, i) => (
                  <tr key={`${m.territorio}-${m.concepto}-${i}`} className="border-b last:border-0 align-top">
                    <td className="py-1.5 pr-3">
                      {m.concepto}
                      {m.territorio !== 'Estatal' && (
                        <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-xs">{m.territorio}</span>
                      )}
                    </td>
                    <td className="py-1.5 pr-3 text-right whitespace-nowrap">
                      {m.importeEur.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
                    </td>
                    <td className="py-1.5 text-xs text-muted-foreground">{m.notas ?? ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Reducciones generales del trabajo {datos.taxYear}</CardTitle>
          <CardDescription>Fórmulas y condiciones de las reducciones sobre rendimientos del trabajo.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {datos.reducciones.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay reducciones registradas.</p>
          ) : (
            datos.reducciones.map((r, i) => (
              <details key={i} className="rounded-md border p-3" open={i === 0}>
                <summary className="cursor-pointer text-sm font-medium">{r.concepto}</summary>
                <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                  {r.formulaTexto && <p>{r.formulaTexto}</p>}
                  {r.condiciones && <p><span className="font-medium text-foreground">Condiciones:</span> {r.condiciones}</p>}
                  {r.notas && <p className="text-xs">{r.notas}</p>}
                </div>
              </details>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}
