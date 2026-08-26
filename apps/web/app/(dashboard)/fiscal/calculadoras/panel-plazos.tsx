'use client'

import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { proximosPlazos } from '@mantigestor/utils'
import type { DatosFiscales } from './types'

const fechaEs = (d: Date) =>
  d.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })

const CATEGORIA_LABELS: Record<string, string> = {
  iva: 'IVA',
  irpf: 'IRPF',
  retenciones: 'Retenciones',
  renta: 'Renta',
  otros: 'Otros',
}

const CATEGORIA_COLORS: Record<string, string> = {
  iva: 'bg-blue-500/10 text-blue-700',
  irpf: 'bg-purple-500/10 text-purple-700',
  retenciones: 'bg-orange-500/10 text-orange-700',
  renta: 'bg-green-500/10 text-green-700',
  otros: 'bg-gray-500/10 text-gray-700',
}

export function PanelPlazos({ datos }: { datos: DatosFiscales }) {
  const plazos = useMemo(() => proximosPlazos(datos.plazos, new Date(), 60), [datos.plazos])

  const agrupados = useMemo(() => {
    const map = new Map<string, typeof plazos>()
    for (const p of plazos) {
      const cat = (p as unknown as { categoria?: string }).categoria ?? 'otros'
      const arr = map.get(cat) ?? []
      arr.push(p)
      map.set(cat, arr)
    }
    return map
  }, [plazos])

  return (
    <Card>
      <CardHeader>
        <CardTitle>Calendario fiscal</CardTitle>
        <CardDescription>Próximos vencimientos de todos los modelos. Verifica siempre el BOE/BOJA.</CardDescription>
      </CardHeader>
      <CardContent>
        {plazos.length === 0 ? (
          <p className="text-sm text-muted-foreground">No hay vencimientos futuros en los próximos 60 días.</p>
        ) : (
          <div className="space-y-4">
            {Array.from(agrupados.entries()).map(([cat, items]) => (
              <div key={cat}>
                <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
                  {CATEGORIA_LABELS[cat] ?? cat}
                </p>
                <ul className="divide-y">
                  {items.map(p => (
                    <li key={p.id} className="flex items-center justify-between gap-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${CATEGORIA_COLORS[cat] ?? ''}`}>
                          {CATEGORIA_LABELS[cat] ?? cat}
                        </span>
                        <div>
                          <p className="text-sm font-medium">
                            {p.modeloNumero === 'VERIFACTU' ? 'Veri*FACTU' : `Modelo ${p.modeloNumero?.replace(/^MOD/, '') ?? '—'}`}{' '}
                            · {p.periodo}
                          </p>
                          <p className="text-xs text-muted-foreground">{fechaEs(p.fechaLimiteReferencia!)}</p>
                        </div>
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
                          p.diasRestantes <= 7
                            ? 'bg-destructive/10 text-destructive'
                            : p.diasRestantes <= 15
                              ? 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400'
                              : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {p.diasRestantes === 0 ? 'vence hoy' : `${p.diasRestantes} días`}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
