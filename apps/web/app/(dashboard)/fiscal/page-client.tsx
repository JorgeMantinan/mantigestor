'use client'

import { Suspense, useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { AlertTriangle, RefreshCw, UserRound, Database } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'
import type { DatosFiscales } from './calculadoras/types'
import { LazyCalculator } from './calculadoras/lazy-wrapper'
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
import { useLanguage } from '@/contexts/language-context'
import { usePersonaActiva } from '@/contexts/persona-activa-context'
import { leerCache, guardarCache } from '@/lib/fiscal/cache'
import { leerPerfil, guardarPerfilBd, type PerfilFiscal } from '@/lib/fiscal/perfil'
import { fetchDatosReales, type DatosReales } from '@/lib/fiscal/datos-reales'
import { SECCIONES_CALCULADORAS, SECCIONES_MODELOS, SECCIONES_UTILIDADES, COMUNIDADES, PERFILES, ETIQUETA_PERFIL, type SeccionKey } from '@/lib/fiscal/constantes'

function PaginaFiscalInner() {
  const { t } = useLanguage()
  const { perfilActivoId } = usePersonaActiva()
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
        const perfilId = perfilActivoId ?? user.id
        const { data: sub } = await supabase
          .from('suscripciones')
          .select('tier, estado')
          .eq('perfilId', perfilId)
          .in('estado', ['active', 'trialing'])
          .order('currentPeriodStart', { ascending: false })
          .limit(1)
          .single()
        setEsPro(sub?.tier === 'PRO')
      } catch {
        // sin sesión o sin sub: se mantiene false
      }
    })()
  }, [perfilActivoId])

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
            : t('fiscalPage.errorCarga')
        throw new Error(msg)
      }
      const payload = json as { data: DatosFiscales; avisos?: string[] }
      setDatos(payload.data)
      setAvisos(payload.avisos ?? [])
      guardarCache(comunidadSel, anhoSel, payload.data, payload.avisos ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : t('fiscalPage.errorInesperado'))
    } finally {
      setCargando(false)
    }
  }, [t])

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
          <h1 className="text-2xl font-bold tracking-tight">{t('fiscalPage.titulo')}</h1>
          <p className="text-sm text-muted-foreground">
            {t('fiscalPage.subtitulo')}
          </p>
        </div>
        {perfil && !mostrarWizard && (
          <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground" onClick={() => setMostrarWizard(true)}>
            <UserRound className="h-4 w-4" aria-hidden="true" />
            {t('fiscalPage.perfilLabel')} {ETIQUETA_PERFIL[perfil]}
          </Button>
        )}
      </header>

      {mostrarWizard && (
        <div role="dialog" aria-label={t('fiscalPage.eligePerfil')} className="rounded-lg border bg-card p-4 space-y-3">
          <p className="font-medium">{t('fiscalPage.eligePerfil')}</p>
          <p className="text-sm text-muted-foreground">{t('fiscalPage.perfilDesc')}</p>
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
          <Label htmlFor="comunidad-fiscal">{t('fiscalPage.comunidadAutonoma')}</Label>
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
          <Label htmlFor="ejercicio-fiscal">{t('fiscalPage.ejercicio')}</Label>
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

      <nav aria-label={t('fiscalPage.seccionesFiscales')} className="print:hidden space-y-2">
        <CollapsibleSection titulo={t('fiscalPage.calculadoras')} defaultAbierto>
          <div className="flex flex-wrap gap-2">
            {SECCIONES_CALCULADORAS.map(s => (
              <Button key={s.key} type="button" size="sm" variant={s.key === seccion ? 'secondary' : 'outline'} onClick={() => setSeccion(s.key)}>
                {s.label}
              </Button>
            ))}
          </div>
        </CollapsibleSection>
        <CollapsibleSection titulo={t('fiscalPage.modelosAeat')} defaultAbierto>
          <div className="flex flex-wrap gap-2">
            {SECCIONES_MODELOS.map(s => (
              <Button key={s.key} type="button" size="sm" variant={s.key === seccion ? 'secondary' : 'outline'} onClick={() => setSeccion(s.key)}>
                {s.label}
              </Button>
            ))}
          </div>
        </CollapsibleSection>
        <CollapsibleSection titulo={t('fiscalPage.utilidades')}>
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
            {t('fiscalPage.reintentar')}
          </Button>
        </div>
      )}

      {cargando && !datos ? (
        <p className="text-sm text-muted-foreground">{t('fiscalPage.cargandoDatosFiscales')}</p>
      ) : datos ? (
        <>
          {seccion === 'irpf' && (
            <LazyCalculator>
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
                    {cargandoReales ? t('fiscalPage.cargando') : datosReales ? t('fiscalPage.recargarDatosReales') : t('fiscalPage.cargarDatosReales')}
                  </Button>
                  {datosReales && (
                    <p className="text-xs text-muted-foreground">
                      {t('fiscalPage.autoRellenado')} {taxYear}
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
            </LazyCalculator>
          )}
          {seccion === 'iva' && <LazyCalculator><CalculadoraIva datos={datos} /></LazyCalculator>}
          {seccion === 'reta' && <LazyCalculator><CalculadoraReta datos={datos} /></LazyCalculator>}
          {seccion === 'sociedades' && <LazyCalculator><CalculadoraIs datos={datos} /></LazyCalculator>}
          {seccion === 'patrimonio' && <LazyCalculator><CalculadoraPatrimonio datos={datos} /></LazyCalculator>}
          {seccion === 'deducciones' && <PanelDeduccionesAutonomicas datos={datos} onTotalChange={setDeduccionesAutonomicas} />}
          {seccion === 'documentos' && <PanelDocumentosFiscales esPro={esPro} />}
          {seccion === 'modelo111' && <LazyCalculator><Calculadora111 taxYear={taxYear} /></LazyCalculator>}
          {seccion === 'modelo190' && <LazyCalculator><Calculadora190 taxYear={taxYear} /></LazyCalculator>}
          {seccion === 'modelo390' && <LazyCalculator><Calculadora390 taxYear={taxYear} /></LazyCalculator>}
          {seccion === 'modelo180' && <LazyCalculator><Calculadora180 taxYear={taxYear} /></LazyCalculator>}
          {seccion === 'modelo202' && <LazyCalculator><Calculadora202 taxYear={taxYear} /></LazyCalculator>}
          {seccion === 'modelo200' && <LazyCalculator><CalculadoraModelo200 /></LazyCalculator>}
          {seccion === 'modelo720' && <LazyCalculator><CalculadoraModelo720 /></LazyCalculator>}
          {seccion === 'modelo151' && <LazyCalculator><CalculadoraModelo151 /></LazyCalculator>}
          {seccion === 'modelo100' && <LazyCalculator><CalculadoraModelo100 datosIniciales={datosReales ? { baseGeneral: datosReales.baseGeneral, pagosFraccionados: datosReales.pagosFraccionados } : undefined} /></LazyCalculator>}
          {seccion === 'modelo131' && <LazyCalculator><CalculadoraModelo131 /></LazyCalculator>}
          {seccion === 'modelo115' && <LazyCalculator><CalculadoraModelo115 /></LazyCalculator>}
          {seccion === 'modelo123' && <LazyCalculator><CalculadoraModelo123 /></LazyCalculator>}
          {seccion === 'modelo347' && <LazyCalculator><CalculadoraModelo347 /></LazyCalculator>}
          {seccion === 'modelo349' && <LazyCalculator><CalculadoraModelo349 datosIniciales={datosReales ? { operaciones: datosReales.operacionesIntracomunitarias } : undefined} /></LazyCalculator>}
          {seccion === 'modelo721' && <LazyCalculator><CalculadoraModelo721 /></LazyCalculator>}
          {seccion === 'modelo714' && <LazyCalculator><CalculadoraModelo714 /></LazyCalculator>}
          {seccion === 'modelo232' && <LazyCalculator><CalculadoraModelo232 /></LazyCalculator>}
          {seccion === 'modelo210' && <LazyCalculator><CalculadoraModelo210 /></LazyCalculator>}
          {seccion === 'modelo220' && <LazyCalculator><CalculadoraModelo220 /></LazyCalculator>}
          {seccion === 'modelo309' && <LazyCalculator><CalculadoraModelo309 datosIniciales={datosReales ? { base21: datosReales.base21, base10: datosReales.base10, base4: datosReales.base4, deducciones: datosReales.deduccionesIva } : undefined} /></LazyCalculator>}
          {seccion === 'modelo184' && <LazyCalculator><CalculadoraModelo184 /></LazyCalculator>}
          {seccion === 'modelo296' && <LazyCalculator><CalculadoraModelo296 /></LazyCalculator>}
          {seccion === 'modelo345' && <LazyCalculator><CalculadoraModelo345 taxYear={taxYear} /></LazyCalculator>}
          {seccion === 'modelo193' && <LazyCalculator><CalculadoraModelo193 taxYear={taxYear} /></LazyCalculator>}
          {seccion === 'modelo369' && <LazyCalculator><CalculadoraModelo369 taxYear={taxYear} /></LazyCalculator>}
          {seccion === 'modelo130' && <LazyCalculator><Calculadora130 taxYear={taxYear} datosIniciales={datosReales ? { ingresos: datosReales.base130Ingresos, gastos: datosReales.base130Gastos, retenciones: datosReales.retencionesNomina } : undefined} /></LazyCalculator>}
          {seccion === 'modelo303' && <LazyCalculator><Calculadora303 taxYear={taxYear} datosIniciales={datosReales ? { base21: datosReales.base21, base10: datosReales.base10, base4: datosReales.base4, baseSop21: datosReales.baseSop21, baseSop10: datosReales.baseSop10, baseSop4: datosReales.baseSop4 } : undefined} /></LazyCalculator>}
          {seccion === 'modelo170' && <LazyCalculator><CalculadoraModelo170 /></LazyCalculator>}
          {seccion === 'modelo179' && <LazyCalculator><CalculadoraModelo179 /></LazyCalculator>}
          {seccion === 'modelo600' && <LazyCalculator><CalculadoraModelo600 /></LazyCalculator>}
          {seccion === 'modelo233' && <LazyCalculator><CalculadoraModelo233 /></LazyCalculator>}
          {seccion === 'modelo036' && <LazyCalculator><CalculadoraModelo036 /></LazyCalculator>}
          {seccion === 'modelo145' && <LazyCalculator><CalculadoraModelo145 /></LazyCalculator>}
          {seccion === 'modelo590' && <LazyCalculator><CalculadoraModelo590 /></LazyCalculator>}
          {seccion === 'modelo222' && <LazyCalculator><CalculadoraModelo222 /></LazyCalculator>}
          {seccion === 'modelo211' && <LazyCalculator><CalculadoraModelo211 /></LazyCalculator>}
          {seccion === 'modelo104' && <LazyCalculator><CalculadoraModelo104 /></LazyCalculator>}
          {seccion === 'plusvalia' && <LazyCalculator><CalculadoraPlusvalia /></LazyCalculator>}
          {seccion === 'modelo110' && <LazyCalculator><CalculadoraModelo110 /></LazyCalculator>}
          {seccion === 'modelo117' && <LazyCalculator><CalculadoraModelo117 /></LazyCalculator>}
          {seccion === 'modelo236' && <LazyCalculator><CalculadoraModelo236 /></LazyCalculator>}
          {seccion === 'modelo282' && <LazyCalculator><CalculadoraModelo282 /></LazyCalculator>}
          {seccion === 'modelo715' && <LazyCalculator><CalculadoraModelo715 /></LazyCalculator>}
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
                    <h3 className="font-semibold mb-2">{t('fiscalPage.obligacionesFiscales')}</h3>
                    <ul className="list-disc pl-5 space-y-1 text-sm">
                      {guia.obligaciones.map((o, i) => <li key={i}>{o}</li>)}
                    </ul>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-2">{t('fiscalPage.consejos')}</h3>
                    <ul className="list-disc pl-5 space-y-1 text-sm">
                      {guia.consejos.map((c, i) => <li key={i}>{c}</li>)}
                    </ul>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-2">{t('fiscalPage.modelosRelevantes')}</h3>
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
            {t('fiscalPage.ejerce')} {datos.taxYear} · datos en caché de la sesión durante 24 h ·{' '}
            <button type="button" className="underline hover:no-underline" onClick={() => void cargarDatos(comunidad, taxYear, true)}>
              {t('fiscalPage.actualizarAhora')}
            </button>
          </p>
        </>
      ) : null}
    </div>
  )
}

export default function PaginaFiscal() {
  const { t } = useLanguage()
  return (
    <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">{t('fiscalPage.cargandoAreaFiscal')}</div>}>
      <PaginaFiscalInner />
    </Suspense>
  )
}
