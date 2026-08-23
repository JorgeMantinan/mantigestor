'use client'

import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Label } from '@/components/ui/label'
import type { DatosFiscales } from './calculadoras/types'
import { CalculadoraIrpf } from './calculadoras/calculadora-irpf'
import { CalculadoraIva } from './calculadoras/calculadora-iva'
import { CalculadoraReta } from './calculadoras/calculadora-retas'
import { CalculadoraIs } from './calculadoras/calculadora-is'
import { CalculadoraPatrimonio } from './calculadoras/calculadora-patrimonio'
import { PanelPlazos } from './calculadoras/panel-plazos'
import { PanelMinimos } from './calculadoras/panel-minimos'

type SeccionKey = 'irpf' | 'iva' | 'reta' | 'sociedades' | 'patrimonio' | 'plazos' | 'minimos'

const SECCIONES: Array<{ key: SeccionKey; label: string }> = [
  { key: 'irpf', label: 'IRPF' },
  { key: 'iva', label: 'IVA' },
  { key: 'reta', label: 'Autónomos (RETA)' },
  { key: 'sociedades', label: 'Sociedades' },
  { key: 'patrimonio', label: 'Patrimonio' },
  { key: 'plazos', label: 'Calendario fiscal' },
  { key: 'minimos', label: 'Mínimos y reducciones' },
]

const COMUNIDADES = [
  'Andalucía',
  'Aragón',
  'Asturias (Principado de)',
  'Balears (Illes)',
  'Canarias',
  'Cantabria',
  'Castilla y León',
  'Castilla-La Mancha',
  'Cataluña',
  'Comunitat Valenciana',
  'Extremadura',
  'Galicia',
  'Madrid (Comunidad de)',
  'Murcia (Región de)',
  'Navarra (Comunidad Foral de)',
  'País Vasco',
  'Rioja (La)',
  'Ceuta',
  'Melilla',
]

export default function PaginaFiscal() {
  const [seccion, setSeccion] = useState<SeccionKey>('irpf')
  const [comunidad, setComunidad] = useState('Madrid (Comunidad de)')
  const [datos, setDatos] = useState<DatosFiscales | null>(null)
  const [avisos, setAvisos] = useState<string[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const cargarDatos = useCallback(async (comunidadSel: string) => {
    setCargando(true)
    setError(null)
    try {
      const res = await fetch(`/api/fiscal/datos?comunidad=${encodeURIComponent(comunidadSel)}&taxYear=2025`)
      const json: unknown = await res.json()
      if (!res.ok) {
        const msg =
          typeof json === 'object' && json !== null && 'error' in json
            ? String((json as Record<string, unknown>).error)
            : 'Error al cargar los datos fiscales'
        throw new Error(msg)
      }
      const payload = json as { data: DatosFiscales; avisos?: string[] }
      setDatos(payload.data)
      setAvisos(payload.avisos ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error inesperado al cargar los datos fiscales')
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => {
    void cargarDatos(comunidad)
  }, [cargarDatos, comunidad])

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Calculadora fiscal</h1>
        <p className="text-sm text-muted-foreground">
          IRPF, IVA, RETA, Sociedades y Patrimonio sobre el dataset oficial importado.
        </p>
      </header>

      <nav aria-label="Secciones fiscales" className="flex flex-wrap gap-2">
        {SECCIONES.map(s => (
          <Button
            key={s.key}
            type="button"
            size="sm"
            variant={s.key === seccion ? 'secondary' : 'outline'}
            onClick={() => setSeccion(s.key)}
          >
            {s.label}
          </Button>
        ))}
      </nav>

      {(seccion === 'irpf' || seccion === 'minimos') && (
        <div className="max-w-xs space-y-2">
          <Label htmlFor="comunidad-fiscal">Comunidad autónoma</Label>
          <select
            id="comunidad-fiscal"
            value={comunidad}
            onChange={e => setComunidad(e.target.value)}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
          >
            {COMUNIDADES.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      )}

      {avisos.length > 0 && (
        <div role="status" className="flex items-start gap-2 rounded-md border border-yellow-500/50 bg-yellow-500/10 p-3 text-sm">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-yellow-600" aria-hidden="true" />
          <div>{avisos.map((a, i) => <p key={i}>{a}</p>)}</div>
        </div>
      )}

      {error && (
        <div role="alert" className="flex items-center justify-between gap-3 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm">
          <span>{error}</span>
          <Button type="button" size="sm" variant="outline" onClick={() => void cargarDatos(comunidad)}>
            <RefreshCw className="mr-1 h-4 w-4" aria-hidden="true" />
            Reintentar
          </Button>
        </div>
      )}

      {cargando && !datos ? (
        <p className="text-sm text-muted-foreground">Cargando datos fiscales...</p>
      ) : datos ? (
        <>
          {seccion === 'irpf' && <CalculadoraIrpf datos={datos} comunidad={comunidad} />}
          {seccion === 'iva' && <CalculadoraIva datos={datos} />}
          {seccion === 'reta' && <CalculadoraReta datos={datos} />}
          {seccion === 'sociedades' && <CalculadoraIs datos={datos} />}
          {seccion === 'patrimonio' && <CalculadoraPatrimonio datos={datos} />}
          {seccion === 'plazos' && <PanelPlazos datos={datos} />}
          {seccion === 'minimos' && <PanelMinimos datos={datos} comunidad={comunidad} />}
        </>
      ) : null}
    </div>
  )
}
