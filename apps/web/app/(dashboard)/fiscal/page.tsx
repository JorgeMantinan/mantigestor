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
import { CalculadoraModelo100 } from './calculadoras/calculadora-100'
import { CalculadoraModelo131 } from './calculadoras/calculadora-131'
import { CalculadoraModelo115 } from './calculadoras/calculadora-115'
import { CalculadoraModelo123 } from './calculadoras/calculadora-123'
import { CalculadoraModelo347 } from './calculadoras/calculadora-347'
import { CalculadoraModelo349 } from './calculadoras/calculadora-349'
import { CalculadoraModelo721 } from './calculadoras/calculadora-721'
import { CalculadoraModelo714 } from './calculadoras/calculadora-714'
import { CalculadoraModelo232 } from './calculadoras/calculadora-232'
import { CalculadoraModelo210 } from './calculadoras/calculadora-210'
import { CalculadoraModelo220 } from './calculadoras/calculadora-220'
import { CalculadoraModelo309 } from './calculadoras/calculadora-309'
import { CalculadoraModelo184 } from './calculadoras/calculadora-184'
import { CalculadoraModelo296 } from './calculadoras/calculadora-296'
import { CalculadoraModelo345 } from './calculadoras/calculadora-345'
import { CalculadoraModelo193 } from './calculadoras/calculadora-193'
import { CalculadoraModelo369 } from './calculadoras/calculadora-369'
import { Calculadora303 } from './calculadoras/calculadora-303'
import { Calculadora130 } from './calculadoras/calculadora-130'
import { CalculadoraModelo170 } from './calculadoras/calculadora-170'
import { CalculadoraModelo179 } from './calculadoras/calculadora-179'
import { CalculadoraModelo600 } from './calculadoras/calculadora-600'
import { CalculadoraModelo233 } from './calculadoras/calculadora-233'
import { CollapsibleSection } from '@/components/ui/collapsible-section'
import { GUIAS_PERFIL } from '@/lib/fiscal/guias-perfil'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

type SeccionKey = 'irpf' | 'iva' | 'reta' | 'sociedades' | 'patrimonio' | 'deducciones' | 'documentos' | 'modelo111' | 'modelo190' | 'modelo390' | 'modelo180' | 'modelo202' | 'modelo200' | 'modelo720' | 'modelo151' | 'modelo100' | 'modelo131' | 'modelo115' | 'modelo123' | 'modelo347' | 'modelo349' | 'modelo721' | 'modelo714' | 'modelo232' | 'modelo210' | 'modelo220' | 'modelo309' | 'modelo184' | 'modelo296' | 'modelo345' | 'modelo193' | 'modelo369' | 'modelo130' | 'modelo303' | 'modelo170' | 'modelo179' | 'modelo600' | 'modelo233' | 'plazos' | 'minimos' | 'resumen' | 'guias'
type PerfilFiscal = 'autonomo' | 'sociedad' | 'empleado' | 'alquilador'

const SECCIONES_CALCULADORAS: Array<{ key: SeccionKey; label: string }> = [
  { key: 'irpf', label: 'IRPF' },
  { key: 'iva', label: 'IVA' },
  { key: 'reta', label: 'Autónomos (RETA)' },
  { key: 'sociedades', label: 'Sociedades' },
  { key: 'patrimonio', label: 'Patrimonio' },
  { key: 'deducciones', label: 'Deducciones autonómicas' },
  { key: 'documentos', label: 'Documentos IA' },
]

const SECCIONES_MODELOS: Array<{ key: SeccionKey; label: string }> = [
  { key: 'modelo100', label: 'Modelo 100' },
  { key: 'modelo111', label: 'Modelo 111' },
  { key: 'modelo115', label: 'Modelo 115' },
  { key: 'modelo123', label: 'Modelo 123' },
  { key: 'modelo130', label: 'Modelo 130' },
  { key: 'modelo131', label: 'Modelo 131' },
  { key: 'modelo151', label: 'Modelo 151' },
  { key: 'modelo170', label: 'Modelo 170' },
  { key: 'modelo179', label: 'Modelo 179' },
  { key: 'modelo180', label: 'Modelo 180' },
  { key: 'modelo184', label: 'Modelo 184' },
  { key: 'modelo190', label: 'Modelo 190' },
  { key: 'modelo193', label: 'Modelo 193' },
  { key: 'modelo200', label: 'Modelo 200 (IS)' },
  { key: 'modelo202', label: 'Modelo 202' },
  { key: 'modelo210', label: 'Modelo 210' },
  { key: 'modelo220', label: 'Modelo 220' },
  { key: 'modelo232', label: 'Modelo 232' },
  { key: 'modelo233', label: 'Modelo 233' },
  { key: 'modelo296', label: 'Modelo 296' },
  { key: 'modelo303', label: 'Modelo 303 (IVA)' },
  { key: 'modelo309', label: 'Modelo 309' },
  { key: 'modelo345', label: 'Modelo 345' },
  { key: 'modelo347', label: 'Modelo 347' },
  { key: 'modelo349', label: 'Modelo 349' },
  { key: 'modelo369', label: 'Modelo 369' },
  { key: 'modelo390', label: 'Modelo 390' },
  { key: 'modelo600', label: 'Modelo 600 (ITP)' },
  { key: 'modelo714', label: 'Modelo 714' },
  { key: 'modelo720', label: 'Modelo 720' },
  { key: 'modelo721', label: 'Modelo 721' },
]

const SECCIONES_UTILIDADES: Array<{ key: SeccionKey; label: string }> = [
  { key: 'guias', label: 'Guías' },
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

function computeIntracomunitarias(ingresos: Array<{ emisorReceptor: string; nifContraparte: string | null; baseImponible: number; tipo: string }>, gastos: Array<{ emisorReceptor: string; nifContraparte: string | null; baseImponible: number; tipo: string }>) {
  const EU_PREFIXES = ['DE','FR','IT','NL','BE','AT','PT','IE','FI','SE','DK','PL','CZ','RO','BG','HR','HU','SK','SI','LT','LV','EE','CY','MT','LU']
  const map = new Map<string, { tercero: string; nif: string; pais: string; tipo: string; baseImponible: number }>()

  for (const f of [...ingresos, ...gastos]) {
    if (!f.nifContraparte) continue
    const prefix = f.nifContraparte.substring(0, 2).toUpperCase()
    if (!EU_PREFIXES.includes(prefix)) continue
    if (prefix === 'ES') continue

    const key = f.nifContraparte
    const existing = map.get(key)
    if (existing) {
      existing.baseImponible += f.baseImponible / 100
    } else {
      const PAIS_MAP: Record<string, string> = {
        DE: 'Alemania', FR: 'Francia', IT: 'Italia', NL: 'Países Bajos', BE: 'Bélgica',
        AT: 'Austria', PT: 'Portugal', IE: 'Irlanda', FI: 'Finlandia', SE: 'Suecia',
        DK: 'Dinamarca', PL: 'Polonia', CZ: 'Chequia', RO: 'Rumanía', BG: 'Bulgaria',
        HR: 'Croacia', HU: 'Hungría', SK: 'Eslovaquia', SI: 'Eslovenia', LT: 'Lituania',
        LV: 'Letonia', EE: 'Estonia', CY: 'Chipre', MT: 'Malta', LU: 'Luxemburgo',
      }
      map.set(key, {
        tercero: f.emisorReceptor,
        nif: f.nifContraparte,
        pais: PAIS_MAP[prefix] ?? prefix,
        tipo: f.tipo === 'ingreso' ? 'entrega' : 'adquisicion',
        baseImponible: f.baseImponible / 100,
      })
    }
  }
  return Array.from(map.values())
}

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
    baseGeneral?: number
    pagosFraccionados?: number
    base21?: number
    base10?: number
    base4?: number
    deduccionesIva?: number
    operacionesIntracomunitarias?: Array<{ tercero: string; nif: string; pais: string; tipo: string; baseImponible: number }>
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
        baseImponible: number
        iva: number
        emisorReceptor: string
        nifContraparte: string | null
      }>

      const facturasIngreso = facturasArr.filter(f => f.tipo === 'ingreso')
      const facturasGasto = facturasArr.filter(f => f.tipo === 'gasto')

      // Actividades económicas: ingresos - gastos deducibles de facturas
      const ingresosFacturas = facturasIngreso
        .reduce((s, f) => s + f.importe, 0)
      const gastosFacturas = facturasGasto
        .filter(f => f.deducible)
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

      // Modelo 100: baseGeneral = trabajo + actividades
      const baseGeneral = trabajoNeto + actividadesNetas

      // Modelo 309: bases por tipo de IVA e IVA deducible
      const base21 = facturasIngreso.filter(f => f.iva === 21).reduce((s, f) => s + f.baseImponible, 0) / 100
      const base10 = facturasIngreso.filter(f => f.iva === 10).reduce((s, f) => s + f.baseImponible, 0) / 100
      const base4 = facturasIngreso.filter(f => f.iva === 4).reduce((s, f) => s + f.baseImponible, 0) / 100
      const deduccionesIva = facturasGasto.reduce((s, f) => s + Math.round(f.baseImponible * f.iva / 100), 0) / 100

      // Modelo 349: operaciones intracomunitarias
      const operacionesIntracomunitarias = computeIntracomunitarias(facturasIngreso, facturasGasto)

      setDatosReales({
        trabajo: trabajoNeto,
        actividades: actividadesNetas,
        pagosACuenta: retencionesNomina,
        deducciones,
        baseGeneral,
        pagosFraccionados: retencionesNomina,
        base21,
        base10,
        base4,
        deduccionesIva,
        operacionesIntracomunitarias,
      })
    } catch {
      // silently fail — the user can still type manually
    } finally {
      setCargandoReales(false)
    }
  }, [taxYear])

  useEffect(() => {
    // Auto-cargar datos reales la primera vez que la sesión está lista
    if (datosReales === null) {
      void cargarDatosReales()
    }
  }, [cargarDatosReales, datosReales])

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

      <nav aria-label="Secciones fiscales" className="print:hidden space-y-2">
        <CollapsibleSection titulo="Calculadoras" defaultAbierto>
          <div className="flex flex-wrap gap-2">
            {SECCIONES_CALCULADORAS.map(s => (
              <Button key={s.key} type="button" size="sm" variant={s.key === seccion ? 'secondary' : 'outline'} onClick={() => setSeccion(s.key)}>
                {s.label}
              </Button>
            ))}
          </div>
        </CollapsibleSection>
        <CollapsibleSection titulo="Modelos AEAT" defaultAbierto>
          <div className="flex flex-wrap gap-2">
            {SECCIONES_MODELOS.map(s => (
              <Button key={s.key} type="button" size="sm" variant={s.key === seccion ? 'secondary' : 'outline'} onClick={() => setSeccion(s.key)}>
                {s.label}
              </Button>
            ))}
          </div>
        </CollapsibleSection>
        <CollapsibleSection titulo="Utilidades">
          <div className="flex flex-wrap gap-2">
            {SECCIONES_UTILIDADES.map(s => (
              <Button key={s.key} type="button" size="sm" variant={s.key === seccion ? 'secondary' : 'outline'} onClick={() => setSeccion(s.key)}>
                {s.label}
              </Button>
            ))}
          </div>
        </CollapsibleSection>
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
                  variant="ghost"
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
          {seccion === 'modelo100' && <CalculadoraModelo100 datosIniciales={datosReales ? { baseGeneral: datosReales.baseGeneral, pagosFraccionados: datosReales.pagosFraccionados } : undefined} />}
          {seccion === 'modelo131' && <CalculadoraModelo131 />}
          {seccion === 'modelo115' && <CalculadoraModelo115 />}
          {seccion === 'modelo123' && <CalculadoraModelo123 />}
          {seccion === 'modelo347' && <CalculadoraModelo347 />}
          {seccion === 'modelo349' && <CalculadoraModelo349 datosIniciales={datosReales ? { operaciones: datosReales.operacionesIntracomunitarias } : undefined} />}
          {seccion === 'modelo721' && <CalculadoraModelo721 />}
          {seccion === 'modelo714' && <CalculadoraModelo714 />}
          {seccion === 'modelo232' && <CalculadoraModelo232 />}
          {seccion === 'modelo210' && <CalculadoraModelo210 />}
          {seccion === 'modelo220' && <CalculadoraModelo220 />}
          {seccion === 'modelo309' && <CalculadoraModelo309 datosIniciales={datosReales ? { base21: datosReales.base21, base10: datosReales.base10, base4: datosReales.base4, deducciones: datosReales.deduccionesIva } : undefined} />}
          {seccion === 'modelo184' && <CalculadoraModelo184 />}
          {seccion === 'modelo296' && <CalculadoraModelo296 />}
          {seccion === 'modelo345' && <CalculadoraModelo345 taxYear={taxYear} />}
          {seccion === 'modelo193' && <CalculadoraModelo193 taxYear={taxYear} />}
          {seccion === 'modelo369' && <CalculadoraModelo369 taxYear={taxYear} />}
          {seccion === 'modelo130' && <Calculadora130 taxYear={taxYear} />}
          {seccion === 'modelo303' && <Calculadora303 taxYear={taxYear} />}
          {seccion === 'modelo170' && <CalculadoraModelo170 />}
          {seccion === 'modelo179' && <CalculadoraModelo179 />}
          {seccion === 'modelo600' && <CalculadoraModelo600 />}
          {seccion === 'modelo233' && <CalculadoraModelo233 />}
          {seccion === 'guias' && (() => {
            const guia = GUIAS_PERFIL[perfil ?? 'autonomo'] ?? GUIAS_PERFIL['autonomo']
            if (!guia) return null
            return (
              <Card>
                <CardHeader>
                  <CardTitle>{guia.titulo}</CardTitle>
                  <CardDescription>{guia.descripcion}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <h3 className="font-semibold mb-2">Obligaciones fiscales</h3>
                    <ul className="list-disc pl-5 space-y-1 text-sm">
                      {guia.obligaciones.map((o, i) => <li key={i}>{o}</li>)}
                    </ul>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-2">Consejos</h3>
                    <ul className="list-disc pl-5 space-y-1 text-sm">
                      {guia.consejos.map((c, i) => <li key={i}>{c}</li>)}
                    </ul>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-2">Modelos relevantes</h3>
                    <div className="flex flex-wrap gap-2">
                      {guia.modelosRelevantes.map((m, i) => (
                        <span key={i} className="inline-flex items-center rounded-md border bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground">{m}</span>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })()}
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
