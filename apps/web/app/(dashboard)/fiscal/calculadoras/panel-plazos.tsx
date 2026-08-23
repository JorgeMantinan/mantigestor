'use client'

import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { proximosPlazos } from '@mantigestor/utils'
import type { DatosFiscales } from './types'

const fechaEs = (d: Date) =>
  d.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })

export function PanelPlazos({ datos }: { datos: DatosFiscales }) {
  const plazos = useMemo(() => proximosPlazos(datos.plazos, new Date(), 15), [datos.plazos])

  return (
    <Card>
      <CardHeader>
        <CardTitle>Próximos vencimientos fiscales</CardTitle>
        <CardDescription>Fechas de referencia del calendario fiscal. Verifica siempre el boletín oficial.</CardDescription>
      </CardHeader>
      <CardContent>
        {plazos.length === 0 ? (
          <p className="text-sm text-muted-foreground">No hay vencimientos futuros con fecha en el calendario.</p>
        ) : (
          <ul className="divide-y">
            {plazos.map(p => (
              <li key={p.id} className="flex items-center justify-between gap-3 py-2.5">
                <div>
                  <p className="text-sm font-medium">
                    {p.modeloNumero === 'VERIFACTU' ? 'Veri*FACTU' : `Modelo ${p.modeloNumero?.replace(/^MOD/, '') ?? '—'}`}{' '}
                    · {p.periodo}
                  </p>
                  <p className="text-xs text-muted-foreground">{fechaEs(p.fechaLimiteReferencia!)}</p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
                    p.diasRestantes <= 15
                      ? 'bg-destructive/10 text-destructive'
                      : p.diasRestantes <= 45
                        ? 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400'
                        : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {p.diasRestantes === 0 ? 'vence hoy' : `${p.diasRestantes} días`}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
