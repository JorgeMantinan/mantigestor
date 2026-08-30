'use client'

import { Suspense, useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
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
import { PanelPackTrimestre } from './calculadoras/panel-pack-trimestre'
import { PanelPresupuestoAnual } from './calculadoras/panel-presupuesto-anual'
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
import { CalculadoraModelo036 } from './calculadoras/calculadora-036'
import { CalculadoraModelo145 } from './calculadoras/calculadora-145'
import { CalculadoraModelo590 } from './calculadoras/calculadora-590'
import { CalculadoraModelo222 } from './calculadoras/calculadora-222'
import { CalculadoraModelo211 } from './calculadoras/calculadora-211'
import { CalculadoraModelo104 } from './calculadoras/calculadora-104'
import { CalculadoraPlusvalia } from './calculadoras/calculadora-plusvalia'
import { CalculadoraModelo110 } from './calculadoras/calculadora-110'
import { CalculadoraModelo117 } from './calculadoras/calculadora-117'
import { CalculadoraModelo236 } from './calculadoras/calculadora-236'
import { CalculadoraModelo282 } from './calculadoras/calculadora-282'
import { CalculadoraModelo715 } from './calculadoras/calculadora-715'
import { CollapsibleSection } from '@/components/ui/collapsible-section'
import { GUIAS_PERFIL } from '@/lib/fiscal/guias-perfil'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { leerCache, guardarCache } from '@/lib/fiscal/cache'
import { leerPerfil, guardarPerfilBd, type PerfilFiscal } from '@/lib/fiscal/perfil'
import { fetchDatosReales, type DatosReales } from '@/lib/fiscal/datos-reales'
import { SECCIONES_CALCULADORAS, SECCIONES_MODELOS, SECCIONES_UTILIDADES, COMUNIDADES, PERFILES, ETIQUETA_PERFIL, type SeccionKey } from '@/lib/fiscal/constantes'

function PaginaFiscalInner() {
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
  const [datosReales, setDatosReales] = useState<DatosReales | null>(null)
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

  // Deep-link: permite abrir una calculadora concreta vía ?seccion=modeloXXX
  const searchParams = useSearchParams()
  useEffect(() => {
    const seccionParam = searchParams.get('seccion')
    if (!seccionParam) return
    const clavesValidas = new Set<SeccionKey>([
      ...SECCIONES_CALCULADORAS.map(s => s.key),
      ...SECCIONES_MODELOS.map(s => s.key),
      ...SECCIONES_UTILIDADES.map(s => s.key),
    ])
    if (clavesValidas.has(seccionParam as SeccionKey)) {
      setSeccion(seccionParam as SeccionKey)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

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
      const resultado = await fetchDatosReales(taxYear)
      setDatosReales(resultado)
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
          {seccion === 'modelo130' && <Calculadora130 taxYear={taxYear} datosIniciales={datosReales ? { ingresos: datosReales.base130Ingresos, gastos: datosReales.base130Gastos, retenciones: datosReales.retencionesNomina } : undefined} />}
          {seccion === 'modelo303' && <Calculadora303 taxYear={taxYear} datosIniciales={datosReales ? { base21: datosReales.base21, base10: datosReales.base10, base4: datosReales.base4, baseSop21: datosReales.baseSop21, baseSop10: datosReales.baseSop10, baseSop4: datosReales.baseSop4 } : undefined} />}
          {seccion === 'modelo170' && <CalculadoraModelo170 />}
          {seccion === 'modelo179' && <CalculadoraModelo179 />}
          {seccion === 'modelo600' && <CalculadoraModelo600 />}
          {seccion === 'modelo233' && <CalculadoraModelo233 />}
          {seccion === 'modelo036' && <CalculadoraModelo036 />}
          {seccion === 'modelo145' && <CalculadoraModelo145 />}
          {seccion === 'modelo590' && <CalculadoraModelo590 />}
          {seccion === 'modelo222' && <CalculadoraModelo222 />}
          {seccion === 'modelo211' && <CalculadoraModelo211 />}
          {seccion === 'modelo104' && <CalculadoraModelo104 />}
          {seccion === 'plusvalia' && <CalculadoraPlusvalia />}
          {seccion === 'modelo110' && <CalculadoraModelo110 />}
          {seccion === 'modelo117' && <CalculadoraModelo117 />}
          {seccion === 'modelo236' && <CalculadoraModelo236 />}
          {seccion === 'modelo282' && <CalculadoraModelo282 />}
          {seccion === 'modelo715' && <CalculadoraModelo715 />}
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
          {seccion === 'packTrimestre' && <PanelPackTrimestre taxYear={taxYear} />}
          {seccion === 'presupuestoAnual' && <PanelPresupuestoAnual taxYear={taxYear} />}
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

export default function PaginaFiscal() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Cargando área fiscal…</div>}>
      <PaginaFiscalInner />
    </Suspense>
  )
}
