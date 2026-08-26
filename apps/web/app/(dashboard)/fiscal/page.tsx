'use client'

import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { AlertTriangle, RefreshCw, UserRound, Database } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'
import type { DatosFiscales } from './calculadoras/types'
import { CalculadoraIrpf } from './calculadoras/calculadora-irpf'
import { CalculadoraIva } from './calculadoras/calculadora-iva'
import { CalculadoraReta } from './calculadoras/calculadora-retas'
import { CalculadoraIs } from './calculadoras/calculadora-is'
import { CalculadoraPatrimonio } from './calculadoras/calculadora-patrimonio'
import { PanelPlazos } from './calculadoras/panel-plazos'
import { PanelMinimos } from './calculadoras/panel-minimos'
import { PanelResumenAnual } from './calculadoras/panel-resumen-anual'
import { PanelDeduccionesAutonomicas } from './calculadoras/panel-deducciones-autonomicas'
import { PanelDocumentosFiscales } from './calculadoras/panel-documentos-fiscales'
import { Calculadora111 } from './calculadoras/calculadora-111'
import { Calculadora390 } from './calculadoras/calculadora-390'
import { Calculadora190 } from './calculadoras/calculadora-190'
import { Calculadora180 } from './calculadoras/calculadora-180'
import { Calculadora202 } from './calculadoras/calculadora-202'
import { CalculadoraModelo200 } from './calculadoras/calculadora-200'
import { CalculadoraModelo720 } from './calculadoras/calculadora-720'
import { CalculadoraModelo151 } from './calculadoras/calculadora-151'

type SeccionKey = 'irpf' | 'iva' | 'reta' | 'sociedades' | 'patrimonio' | 'deducciones' | 'documentos' | 'modelo111' | 'modelo190' | 'modelo390' | 'modelo180' | 'modelo202' | 'modelo200' | 'modelo720' | 'modelo151' | 'plazos' | 'minimos' | 'resumen'
type PerfilFiscal = 'autonomo' | 'sociedad' | 'empleado' | 'alquilador'

const SECCIONES: Array<{ key: SeccionKey; label: string }> = [
  { key: 'irpf', label: 'IRPF' },
  { key: 'iva', label: 'IVA' },
  { key: 'reta', label: 'Autónomos (RETA)' },
  { key: 'sociedades', label: 'Sociedades' },
  { key: 'patrimonio', label: 'Patrimonio' },
  { key: 'deducciones', label: 'Deducciones autonómicas' },
  { key: 'documentos', label: 'Documentos IA' },
  { key: 'modelo111', label: 'Modelo 111' },
  { key: 'modelo190', label: 'Modelo 190' },
  { key: 'modelo390', label: 'Modelo 390' },
  { key: 'modelo180', label: 'Modelo 180' },
  { key: 'modelo202', label: 'Modelo 202' },
  { key: 'modelo200', label: 'Modelo 200 (IS)' },
  { key: 'modelo720', label: 'Modelo 720' },
  { key: 'modelo151', label: 'Modelo 151' },
  { key: 'plazos', label: 'Calendario fiscal' },
  { key: 'minimos', label: 'Mínimos y reducciones' },
  { key: 'resumen', label: 'Resumen anual' },
]

const COMUNIDADES = [
  'Andalucía',
  'Aragón',
  'Asturias (Principado de)',
  'Illes Balears',
  'Canarias',
  'Cantabria',
  'Castilla y León',
  'Castilla-La Mancha',
  'Cataluña',
  'Comunitat Valenciana',
  'Extremadura',
  'Galicia',
  'Madrid (Comunidad de)',
  'Región de Murcia',
  'Navarra (Comunidad Foral de)',
  'País Vasco - Álava',
  'País Vasco - Bizkaia',
  'País Vasco - Gipuzkoa',
  'La Rioja',
  'Ceuta',
  'Melilla',
]

const PERFILES: Array<{ key: PerfilFiscal; label: string; seccionInicial: SeccionKey }> = [
  { key: 'autonomo', label: 'Autónomo / freelance', seccionInicial: 'reta' },
  { key: 'sociedad', label: 'Sociedad / SL', seccionInicial: 'sociedades' },
  { key: 'empleado', label: 'Empleado por cuenta ajena', seccionInicial: 'irpf' },
  { key: 'alquilador', label: 'Propietario con alquileres', seccionInicial: 'irpf' },
]

const ETIQUETA_PERFIL: Record<PerfilFiscal, string> = {
  autonomo: 'Autónomo / freelance',
  sociedad: 'Sociedad / SL',
  empleado: 'Empleado por cuenta ajena',
  alquilador: 'Propietario con alquileres',
}

interface CacheEntry {
  ts: number
  data: DatosFiscales
  avisos: string[]
}

const TTL_MS = 24 * 60 * 60 * 1000

function leerCache(comunidad: string, taxYear: number): CacheEntry | null {
  if (typeof window === 'undefined') return null
  try {
    const bruto = window.sessionStorage.getItem(`fiscal-datos-v1-${comunidad}-${taxYear}`)
    if (!bruto) return null
    const entrada = JSON.parse(bruto) as CacheEntry
    if (!entrada?.data || Date.now() - entrada.ts > TTL_MS) return null
    return entrada
  } catch {
    return null
  }
}

function guardarCache(comunidad: string, taxYear: number, data: DatosFiscales, avisos: string[]): void {
  if (typeof window === 'undefined') return
  try {
    window.sessionStorage.setItem(`fiscal-datos-v1-${comunidad}-${taxYear}`, JSON.stringify({ ts: Date.now(), data, avisos }))
  } catch {
    // cuota de almacenamiento llena: sin caché no pasa nada
  }
}

function leerPerfil(): PerfilFiscal | null {
  if (typeof window === 'undefined') return null
  const p = window.localStorage.getItem('perfil-fiscal')
  return p === 'autonomo' || p === 'sociedad' || p === 'empleado' || p === 'alquilador' ? p : null
}

/** Guarda el perfil fiscal en BD (multi-dispositivo). Fallo silencioso: localStorage ya lo conserva. */
async function guardarPerfilBd(cuerpo: { comunidadFiscal?: string; perfilFiscal?: PerfilFiscal }): Promise<void> {
  try {
    await fetch('/api/fiscal/perfil', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cuerpo),
    })
  } catch {
    // sin conexión o sin sesión: se mantiene la preferencia local
  }
}

export default function PaginaFiscal() {
  const [seccion, setSeccion] = useState<SeccionKey>('irpf')
  const [comunidad, setComunidad] = useState('Madrid (Comunidad de)')
  const [taxYear, setTaxYear] = useState(2025)
  const [datos, setDatos] = useState<DatosFiscales | null>(null)
  const [avisos, setAvisos] = useState<string[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [perfil, setPerfil] = useState<PerfilFiscal | null>(null)
  const [mostrarWizard, setMostrarWizard] = useState(false)
  const [sincronizado, setSincronizado] = useState(false)
  const [esPro, setEsPro] = useState(false)
  const [datosReales, setDatosReales] = useState<{
    trabajo?: number
    actividades?: number
    pagosACuenta?: number
    deducciones?: number
  } | null>(null)
  const [cargandoReales, setCargandoReales] = useState(false)
  const [deduccionesAutonomicas, setDeduccionesAutonomicas] = useState(0)

  useEffect(() => {
    void (async () => {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        const { data: sub } = await supabase
          .from('suscripciones')
          .select('tier, estado')
          .eq('perfilId', user.id)
          .in('estado', ['active', 'trialing'])
          .order('currentPeriodStart', { ascending: false })
          .limit(1)
          .single()
        setEsPro(sub?.tier === 'PRO')
      } catch {
        // sin sesión o sin sub: se mantiene false
      }
    })()
  }, [])

  useEffect(() => {
    const p = leerPerfil()
    setPerfil(p)
    setMostrarWizard(!p)
    // Sincroniza con la BD ANTES de la primera carga de datos: la preferencia guardada
    // en cuenta manda sobre el dispositivo local y evita cargas en carrera con distinta comunidad
    void (async () => {
      try {
        const res = await fetch('/api/fiscal/perfil')
        if (res.ok) {
          const json = (await res.json()) as {
            data?: { comunidadFiscal?: string | null; perfilFiscal?: PerfilFiscal | null }
          }
          const bd = json.data
          if (bd?.comunidadFiscal) setComunidad(bd.comunidadFiscal)
          if (bd?.perfilFiscal) {
            setPerfil(bd.perfilFiscal)
            setMostrarWizard(false)
            // Nota: NO forzamos aquí seccionInicial para no pisar la elección
            // del usuario si interactúa antes de que resuelva la sincronización
          }
        }
      } catch {
        // sin sesión o red caída: seguimos con localStorage
      } finally {
        setSincronizado(true)
      }
    })()
  }, [])

  const cargarDatos = useCallback(async (comunidadSel: string, anhoSel: number, forzar = false) => {
    if (!forzar) {
      const cache = leerCache(comunidadSel, anhoSel)
      if (cache) {
        setDatos(cache.data)
        setAvisos(cache.avisos)
        setCargando(false)
        setError(null)
        return
      }
    }
    setCargando(true)
    setError(null)
    try {
      const res = await fetch(`/api/fiscal/datos?comunidad=${encodeURIComponent(comunidadSel)}&taxYear=${anhoSel}`)
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
      guardarCache(comunidadSel, anhoSel, payload.data, payload.avisos ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error inesperado al cargar los datos fiscales')
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => {
    if (!sincronizado) return
    void cargarDatos(comunidad, taxYear)
  }, [sincronizado, cargarDatos, comunidad, taxYear])

  const elegirPerfil = (p: PerfilFiscal) => {
    setPerfil(p)
    setMostrarWizard(false)
    try {
      window.localStorage.setItem('perfil-fiscal', p)
    } catch {
      // almacenamiento bloqueado: solo estado de sesión
    }
    void guardarPerfilBd({ perfilFiscal: p, comunidadFiscal: comunidad })
    const config = PERFILES.find(x => x.key === p)
    if (config) setSeccion(config.seccionInicial)
  }

  const cargarDatosReales = useCallback(async () => {
    setCargandoReales(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const desde = `${taxYear}-01-01`
      const hasta = `${taxYear + 1}-01-01`

      // Fetch facturas del año
      const { data: facturas } = await supabase
        .from('facturas')
        .select('*')
        .eq('perfilId', user.id)
        .gte('fechaEmision', desde)
        .lt('fechaEmision', hasta)

      // Fetch nominas del año (empleado: retenciones IRPF)
      const { data: nominasEmp } = await supabase
        .from('nominas')
        .select('salarioBruto, irpf, neto')
        .eq('perfilId', user.id)
        .eq('rol', 'empleado')
        .eq('anyo', taxYear)

      // Fetch nominas del año (jefe: gastos deducibles)
      const { data: nominasJefe } = await supabase
        .from('nominas')
        .select('salarioBruto')
        .eq('perfilId', user.id)
        .eq('rol', 'jefe')
        .eq('anyo', taxYear)

      // Fetch gastos alquiler deducibles del año
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
          .gte('fecha', desde)
          .lt('fecha', hasta)
        if (gastos) gastosAlquiler = gastos.reduce((s, g) => s + (g.importe ?? 0), 0)
      }

      // Calcular datos reales
      const facturasArr = (facturas ?? []) as unknown as Array<{
        tipo: string
        importe: number
        deducible: boolean | null
      }>

      // Actividades económicas: ingresos - gastos deducibles de facturas
      const ingresosFacturas = facturasArr
        .filter(f => f.tipo === 'ingreso')
        .reduce((s, f) => s + f.importe, 0)
      const gastosFacturas = facturasArr
        .filter(f => f.tipo === 'gasto' && f.deducible)
        .reduce((s, f) => s + f.importe, 0)
      const actividadesNetas = Math.max(0, ingresosFacturas - gastosFacturas)

      // Trabajo: sumatorio neto de nóminas como empleada
      const trabajoNeto = nominasEmp
        ? nominasEmp.reduce((s, n) => s + n.neto, 0)
        : 0

      // Pagos a cuenta: retenciones IRPF de nóminas como empleada
      const retencionesNomina = nominasEmp
        ? nominasEmp.reduce((s, n) => s + Math.round(n.salarioBruto * (n.irpf / 100)), 0)
        : 0

      // Deducciones: gastos alquiler deducibles
      const deducciones = gastosAlquiler

      setDatosReales({
        trabajo: trabajoNeto,
        actividades: actividadesNetas,
        pagosACuenta: retencionesNomina,
        deducciones,
      })
    } catch {
      // silently fail — the user can still type manually
    } finally {
      setCargandoReales(false)
    }
  }, [taxYear])

  const anhoActual = new Date().getFullYear()

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Calculadora fiscal</h1>
          <p className="text-sm text-muted-foreground">
            IRPF, IVA, RETA, Sociedades y Patrimonio sobre el dataset oficial importado.
          </p>
        </div>
        {perfil && !mostrarWizard && (
          <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground" onClick={() => setMostrarWizard(true)}>
            <UserRound className="h-4 w-4" aria-hidden="true" />
            Perfil: {ETIQUETA_PERFIL[perfil]}
          </Button>
        )}
      </header>

      {mostrarWizard && (
        <div role="dialog" aria-label="Elige tu perfil fiscal" className="rounded-lg border bg-card p-4 space-y-3">
          <p className="font-medium">¿Cuál es tu situación fiscal?</p>
          <p className="text-sm text-muted-foreground">Te llevamos a la calculadora que más te interesa. Puedes cambiarlo cuando quieras.</p>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {PERFILES.map(p => (
              <Button
                key={p.key}
                type="button"
                variant={perfil === p.key ? 'secondary' : 'outline'}
                onClick={() => elegirPerfil(p.key)}
              >
                {p.label}
              </Button>
            ))}
          </div>
        </div>
      )}

      {(seccion === 'irpf' || seccion === 'minimos') && (
        <div className="flex flex-wrap gap-3 print:hidden">
          <div className="max-w-xs flex-1 space-y-2">
            <Label htmlFor="comunidad-fiscal">Comunidad autónoma</Label>
            <select
              id="comunidad-fiscal"
              value={comunidad}
              onChange={e => {
                setComunidad(e.target.value)
                void guardarPerfilBd({ comunidadFiscal: e.target.value })
              }}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
            >
              {COMUNIDADES.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div className="w-32 space-y-2">
            <Label htmlFor="ejercicio-fiscal">Ejercicio</Label>
            <select
              id="ejercicio-fiscal"
              value={taxYear}
              onChange={e => setTaxYear(Number(e.target.value))}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
            >
              {[anhoActual - 1, anhoActual].map(a => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      <nav aria-label="Secciones fiscales" className="print:hidden flex flex-wrap gap-2">
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

      {avisos.length > 0 && (
        <div role="status" className="print:hidden flex items-start gap-2 rounded-md border border-yellow-500/50 bg-yellow-500/10 p-3 text-sm">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-yellow-600" aria-hidden="true" />
          <div>{avisos.map((a, i) => <p key={i}>{a}</p>)}</div>
        </div>
      )}

      {error && (
        <div role="alert" className="print:hidden flex items-center justify-between gap-3 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm">
          <span>{error}</span>
          <Button type="button" size="sm" variant="outline" onClick={() => void cargarDatos(comunidad, taxYear, true)}>
            <RefreshCw className="mr-1 h-4 w-4" aria-hidden="true" />
            Reintentar
          </Button>
        </div>
      )}

      {cargando && !datos ? (
        <p className="text-sm text-muted-foreground">Cargando datos fiscales...</p>
      ) : datos ? (
        <>
          {seccion === 'irpf' && (
            <>
              <div className="flex items-center gap-2 print:hidden">
                <Button
                  type="button"
                  size="sm"
                  variant={datosReales ? 'secondary' : 'outline'}
                  onClick={() => void cargarDatosReales()}
                  disabled={cargandoReales}
                >
                  <Database className="mr-1 h-3 w-3" aria-hidden="true" />
                  {cargandoReales ? 'Cargando...' : datosReales ? 'Recargar datos reales' : 'Cargar datos reales'}
                </Button>
                {datosReales && (
                  <p className="text-xs text-muted-foreground">
                    Auto-rellenado desde facturas, nóminas y alquileres del año {taxYear}
                  </p>
                )}
              </div>
              <CalculadoraIrpf
                datos={datos}
                comunidad={comunidad}
                datosIniciales={{
                  ...datosReales,
                  deducciones: (datosReales?.deducciones ?? 0) + deduccionesAutonomicas,
                }}
              />
            </>
          )}
          {seccion === 'iva' && <CalculadoraIva datos={datos} />}
          {seccion === 'reta' && <CalculadoraReta datos={datos} />}
          {seccion === 'sociedades' && <CalculadoraIs datos={datos} />}
          {seccion === 'patrimonio' && <CalculadoraPatrimonio datos={datos} />}
          {seccion === 'deducciones' && <PanelDeduccionesAutonomicas datos={datos} onTotalChange={setDeduccionesAutonomicas} />}
          {seccion === 'documentos' && <PanelDocumentosFiscales esPro={esPro} />}
          {seccion === 'modelo111' && <Calculadora111 taxYear={taxYear} />}
          {seccion === 'modelo190' && <Calculadora190 taxYear={taxYear} />}
          {seccion === 'modelo390' && <Calculadora390 taxYear={taxYear} />}
          {seccion === 'modelo180' && <Calculadora180 taxYear={taxYear} />}
          {seccion === 'modelo202' && <Calculadora202 taxYear={taxYear} />}
          {seccion === 'modelo200' && <CalculadoraModelo200 />}
          {seccion === 'modelo720' && <CalculadoraModelo720 />}
          {seccion === 'modelo151' && <CalculadoraModelo151 />}
          {seccion === 'plazos' && <PanelPlazos datos={datos} />}
          {seccion === 'minimos' && <PanelMinimos datos={datos} comunidad={comunidad} />}
          {seccion === 'resumen' && <PanelResumenAnual datos={datos} comunidad={comunidad} />}
          <p className="print:hidden text-xs text-muted-foreground">
            Ejercicio {datos.taxYear} · datos en caché de la sesión durante 24 h ·{' '}
            <button type="button" className="underline hover:no-underline" onClick={() => void cargarDatos(comunidad, taxYear, true)}>
              actualizar ahora
            </button>
          </p>
        </>
      ) : null}
    </div>
  )
}
