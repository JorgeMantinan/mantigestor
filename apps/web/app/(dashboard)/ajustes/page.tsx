'use client'

import { useEffect, useState, useCallback } from 'react'
import { useTheme } from 'next-themes'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Users, Upload, Trash2, Share2, Copy, Check, PenTool } from 'lucide-react'
import { FirmaCanvas } from '@/components/firma-canvas'
import { guardarFirma, eliminarFirma, obtenerFirma, type FirmaDigital } from '@/lib/firma-digital'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { createClient } from '@/lib/supabase/client'
import { NOTAS_PIE_PREDEFINIDAS, obtenerNotasPieDefecto, guardarNotasPieDefectoPorUserId } from '@/lib/notas-pie-factura'
import { useLanguage } from '@/contexts/language-context'

type Tab = 'perfil' | 'suscripcion' | 'apariencia'

export default function AjustesPage() {
  const [tab, setTab] = useState<Tab>('perfil')
  const { t } = useLanguage()

  const tabs: { value: Tab; label: string }[] = [
    { value: 'perfil', label: t('ajustes.perfil') },
    { value: 'suscripcion', label: t('ajustes.suscripcion') },
    { value: 'apariencia', label: t('ajustes.apariencia') },
  ]

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="text-3xl font-heading font-bold tracking-tight">{t('ajustes.titulo')}</h1>
        <p className="text-muted-foreground">{t('ajustes.subtitulo')}</p>
      </div>

      <div className="flex gap-1 rounded-lg border p-1">
        {tabs.map((t) => (
          <button
            key={t.value}
            onClick={() => setTab(t.value)}
            className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              tab === t.value
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'perfil' && <PerfilTab />}
      {tab === 'suscripcion' && <SuscripcionTab />}
      {tab === 'apariencia' && <AparienciaTab />}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>{t('ajustes.personasAsociadas')}</CardTitle>
            <CardDescription>{t('ajustes.subtituloPersonas')}</CardDescription>
          </div>
          <div className="flex gap-2">
            <ShareDialog />
            <Link href="/ajustes/personas">
              <Button variant="outline" size="sm" className="gap-2">
                <Users className="h-4 w-4" />
                {t('ajustes.verPersonas')}
              </Button>
            </Link>
          </div>
        </CardHeader>
      </Card>
    </div>
  )
}

function PerfilTab() {
  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [nif, setNif] = useState('')
  const [notasPie, setNotasPie] = useState<string[]>([])
  const [logoBase64, setLogoBase64] = useState<string | null>(null)
  const [firma, setFirma] = useState<FirmaDigital | null>(null)
  const [idiomaFactura, setIdiomaFactura] = useState<'es' | 'en'>('es')
  const [guardando, setGuardando] = useState(false)
  const [guardadoOk, setGuardadoOk] = useState(false)
  const [guardandoFirma, setGuardandoFirma] = useState(false)
  const [cargando, setCargando] = useState(true)
  const getSupabase = useCallback(() => createClient(), [])
  const { t } = useLanguage()

  useEffect(() => {
    const cargar = async () => {
      const { data: { user } } = await getSupabase().auth.getUser()
      if (!user) { setCargando(false); return }
      setEmail(user.email ?? '')

      const { data } = await getSupabase()
        .from('perfiles')
        .select('nombre, nif, notasPie, logoBase64, idiomaFactura')
        .eq('userId', user.id)
        .single()

      if (data) {
        setNombre(data.nombre ?? '')
        setNif(data.nif ?? '')
        setLogoBase64(data.logoBase64 ?? null)
        setIdiomaFactura((data.idiomaFactura as 'es' | 'en') ?? 'es')
      }
      const notas = await obtenerNotasPieDefecto(user.id)
      setNotasPie(notas)
      const firmaCargada = await obtenerFirma(user.id)
      setFirma(firmaCargada)
      setCargando(false)
    }
    cargar()
  }, [getSupabase])

  const guardar = async () => {
    setGuardando(true)
    try {
      const { data: { user } } = await getSupabase().auth.getUser()
      if (!user) { setGuardando(false); return }

      const { error } = await getSupabase()
        .from('perfiles')
        .update({
          nombre,
          nif,
          notasPie,
          logoBase64,
          idiomaFactura,
        })
        .eq('userId', user.id)

      if (error) {
        console.error('Error guardando perfil:', JSON.stringify(error))
        alert('Error guardando: ' + error.message)
      } else {
        console.log('Perfil guardado correctamente para:', user.id)
        setGuardadoOk(true)
        setTimeout(() => setGuardadoOk(false), 3000)
      }
      await guardarNotasPieDefectoPorUserId(user.id, notasPie)
    } catch (e) {
      console.error('Error inesperado guardando:', e)
      alert('Error inesperado: ' + (e instanceof Error ? e.message : String(e)))
    } finally {
      setGuardando(false)
    }
  }

  return (
    <>
    <Card>
      <CardHeader>
        <CardTitle>{t('ajustes.informacionPersonal')}</CardTitle>
        <CardDescription>{t('ajustes.actualizaDatos')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {cargando ? (
          <p className="text-sm text-muted-foreground">{t('ajustes.cargandoPerfil')}</p>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="nombre">{t('ajustes.nombreCompleto')}</Label>
                <Input id="nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder={t('ajustes.placeholderNombre')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} disabled />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="nif">{t('ajustes.nifCif')}</Label>
                <Input id="nif" value={nif} onChange={(e) => setNif(e.target.value)} placeholder="12345678Z" />
              </div>
            </div>
            <Separator />
            <div className="space-y-2">
              <Label htmlFor="idiomaFactura">{t('ajustes.idiomaFacturas')}</Label>
              <p className="text-xs text-muted-foreground">{t('ajustes.descripcionIdioma')}</p>
              <select
                id="idiomaFactura"
                value={idiomaFactura}
                onChange={(e) => setIdiomaFactura(e.target.value as 'es' | 'en')}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="es">Español (ES)</option>
                <option value="en">English (EN)</option>
              </select>
            </div>
            <Separator />
            <div className="space-y-2">
              <Label>{t('ajustes.logoEmpresa')}</Label>
              <p className="text-xs text-muted-foreground">{t('ajustes.descripcionLogo')}</p>
              {logoBase64 ? (
                <div className="flex items-center gap-4">
                  <img src={logoBase64} alt="Logo de empresa" className="h-16 w-auto rounded border bg-white p-1 object-contain" />
                  <Button variant="ghost" size="sm" className="text-destructive gap-1" onClick={() => setLogoBase64(null)}>
                    <Trash2 className="h-4 w-4" /> {t('ajustes.eliminarLogo')}
                  </Button>
                </div>
              ) : (
                <label className="flex cursor-pointer items-center gap-2 rounded-md border border-dashed p-4 text-sm text-muted-foreground hover:bg-muted transition-colors">
                  <Upload className="h-4 w-4" />
                  {t('ajustes.seleccionarImagen')}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (!file) return
                      if (file.size > 500 * 1024) {
                        alert(t('ajustes.archivoGrande'))
                        return
                      }
                      const reader = new FileReader()
                      reader.onload = () => setLogoBase64(reader.result as string)
                      reader.readAsDataURL(file)
                    }}
                  />
                </label>
              )}
            </div>
            <Separator />
            <div className="space-y-2">
              <Label>{t('ajustes.notasPie')}</Label>
              <p className="text-xs text-muted-foreground">{t('ajustes.descripcionNotas')}</p>
              {notasPie.length > 0 && (
                <div className="space-y-1">
                  {notasPie.map((nota, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Input
                        value={nota}
                        onChange={(e) => {
                          const updated = [...notasPie]
                          updated[i] = e.target.value
                          setNotasPie(updated)
                        }}
                        placeholder={t('ajustes.placeholderNota')}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="shrink-0"
                        onClick={() => setNotasPie(notasPie.filter((_, j) => j !== i))}
                      >
                        ×
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setNotasPie([...notasPie, ''])}
                >
                  {t('ajustes.anyadirNota')}
                </Button>
                {notasPie.length === 0 && (
                  <div className="flex flex-wrap gap-1">
                    {NOTAS_PIE_PREDEFINIDAS.slice(0, 3).map((predefinida, i) => (
                      <Button
                        key={i}
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => setNotasPie([predefinida])}
                      >
                        + {predefinida.length > 40 ? predefinida.slice(0, 40) + '…' : predefinida}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <Button onClick={guardar} disabled={guardando || cargando}>
              {guardando ? t('ajustes.guardando') + '...' : t('ajustes.guardarCambios')}
            </Button>
            {guardadoOk && (
              <p className="text-sm text-green-500 mt-2">✓ {t('ajustes.cambiosGuardados')}</p>
            )}
          </>
        )}
      </CardContent>
    </Card>
    <FirmaSection firma={firma} onFirmaGuardada={(f) => setFirma(f)} />
    </>
  )
}

function FirmaSection({ firma, onFirmaGuardada }: { firma: FirmaDigital | null; onFirmaGuardada: (f: FirmaDigital | null) => void }) {
  const [eliminando, setEliminando] = useState(false)
  const { t } = useLanguage()

  const handleFirmaGuardada = async (base64: string) => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const nuevaFirma: FirmaDigital = {
      imagen: base64,
      nombre: firma?.nombre ?? '',
      fecha: new Date().toISOString(),
      cargo: firma?.cargo ?? '',
    }

    await guardarFirma(user.id, nuevaFirma)
    onFirmaGuardada(nuevaFirma)
  }

  const handleEliminar = async () => {
    setEliminando(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await eliminarFirma(user.id)
      }
      onFirmaGuardada(null)
    } finally {
      setEliminando(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PenTool className="h-5 w-5" />
          {t('ajustes.firmaDigital')}
        </CardTitle>
        <CardDescription>{t('ajustes.descripcionFirma')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {firma ? (
          <div className="space-y-4">
            <div className="rounded-md border bg-white p-4">
              <img src={firma.imagen} alt="Firma digital" className="mx-auto h-auto max-h-32 w-auto" />
            </div>
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Firma de <strong>{firma.nombre}</strong> — {new Date(firma.fecha).toLocaleDateString('es-ES')}
              </p>
              <Button variant="ghost" size="sm" className="text-destructive gap-1" onClick={handleEliminar} disabled={eliminando}>
                <Trash2 className="h-4 w-4" />
                {eliminando ? t('ajustes.eliminando') + '...' : t('ajustes.eliminarFirma')}
              </Button>
            </div>
            <FirmaCanvas onFirmaGuardada={handleFirmaGuardada} nombreInicial={firma.nombre} />
          </div>
        ) : (
          <FirmaCanvas onFirmaGuardada={handleFirmaGuardada} />
        )}
      </CardContent>
    </Card>
  )
}

function SuscripcionTab() {
  const [loading, setLoading] = useState<'checkout' | 'portal' | null>(null)
  const [stripeOk, setStripeOk] = useState(true)
  const [subscription, setSubscription] = useState<{
    tier: string
    estado: string
    currentPeriodEnd: string
  } | null>(null)
  const [subLoading, setSubLoading] = useState(true)
  const { t } = useLanguage()

  const cargarSuscripcion = useCallback(async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSubLoading(false); return }

    const { data } = await supabase
      .from('suscripciones')
      .select('tier, estado, currentPeriodEnd')
      .eq('perfilId', user.id)
      .order('currentPeriodStart', { ascending: false })
      .limit(1)
      .maybeSingle()

    setSubscription(data)
    setSubLoading(false)
  }, [])

  const sincronizar = useCallback(async () => {
    setSubLoading(true)
    const params = new URLSearchParams(window.location.search)
    const res = await fetch('/api/stripe/verify-subscription', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: params.get('session_id') }),
    })
    const data = await res.json()
    if (data.tier === 'PRO') {
      setSubscription({ tier: 'PRO', estado: 'active', currentPeriodEnd: '' })
    } else {
      await cargarSuscripcion()
    }
    setSubLoading(false)
  }, [cargarSuscripcion])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('success') === 'true') {
      sincronizar()
    } else {
      cargarSuscripcion()
    }
  }, [cargarSuscripcion, sincronizar])

  async function handleCheckout() {
    setLoading('checkout')
    try {
      const res = await fetch('/api/stripe/checkout', { method: 'POST' })
      const data = await res.json()
      if (data.disponible === false) { setStripeOk(false); setLoading(null); return }
      if (data.url) { window.location.href = data.url }
    } catch { setLoading(null) }
  }

  async function handlePortal() {
    setLoading('portal')
    try {
      const res = await fetch('/api/stripe/portal', { method: 'POST' })
      const data = await res.json()
      if (data.disponible === false) { setStripeOk(false); setLoading(null); return }
      if (data.url) { window.location.href = data.url }
    } catch { setLoading(null) }
  }

  const isPro = subscription?.tier === 'PRO'
  const isActive = subscription?.estado === 'active'

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('ajustes.suscripcion')}</CardTitle>
        <CardDescription>{t('ajustes.gestionarSuscripcion')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg border bg-muted/50 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">{t('ajustes.planActual')}</p>
              <p className="text-sm text-muted-foreground">
                {subLoading
                  ? t('dashboard.cargando')
                  : isPro && isActive
                    ? t('ajustes.planPRO')
                    : isPro && !isActive
                      ? t('ajustes.suscripcionCaducada')
                      : t('ajustes.planBASIC')}
              </p>
            </div>
            <div className="rounded-full bg-yellow-100 px-3 py-1 text-xs font-semibold text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
              {subLoading ? '...' : isPro ? 'PRO' : 'BASIC'}
            </div>
          </div>
        </div>
        <div className="space-y-2">
          <Button variant="link" size="sm" onClick={sincronizar} disabled={subLoading}>
            {subLoading ? t('ajustes.sincronizando') : t('ajustes.sincronizar')}
          </Button>
        </div>
        <div className="space-y-2">
          <Label>{t('ajustes.metodoPago')}</Label>
          <div className="flex gap-4">
            {isPro && isActive ? (
              <Button
                variant="outline"
                className="flex-1"
                onClick={handlePortal}
                disabled={loading === 'portal'}
              >
                {loading === 'portal' ? t('dashboard.cargando') : stripeOk ? t('ajustes.gestionarSuscripcion') : t('ajustes.proximamente')}
              </Button>
            ) : (
              <Button
                variant="outline"
                className="flex-1"
                onClick={handleCheckout}
                disabled={loading === 'checkout'}
              >
                {loading === 'checkout' ? 'Redirigiendo...' : stripeOk ? 'Stripe' : t('ajustes.proximamente')}
              </Button>
            )}
            <Button variant="outline" className="flex-1" disabled>
              PayPal
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            {!stripeOk
              ? t('ajustes.pagosOnline')
              : isPro && isActive
                ? t('ajustes.portalStripe')
                : t('ajustes.contratarBeneficios')}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

function AparienciaTab() {
  const { theme, setTheme } = useTheme()
  const { t } = useLanguage()

  const themes: { value: string; label: string }[] = [
    { value: 'light', label: t('ajustes.claro') },
    { value: 'dark', label: t('ajustes.oscuro') },
    { value: 'system', label: t('ajustes.sistema') },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('ajustes.apariencia')}</CardTitle>
        <CardDescription>{t('ajustes.personalizaVista')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>{t('ajustes.tema')}</Label>
          <div className="flex gap-4">
            {themes.map((t) => (
              <Button
                key={t.value}
                variant={theme === t.value ? 'default' : 'outline'}
                className="flex-1"
                onClick={() => setTheme(t.value)}
              >
                {t.label}
              </Button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function ShareDialog() {
  const [open, setOpen] = useState(false)
  const [shareLink, setShareLink] = useState('')
  const [generando, setGenerando] = useState(false)
  const [copiado, setCopiado] = useState(false)
  const [nombreInvitado, setNombreInvitado] = useState('')
  const [emailInvitado, setEmailInvitado] = useState('')
  const [error, setError] = useState('')
  const { t } = useLanguage()

  const handleGenerarEnlace = async () => {
    if (!emailInvitado.trim()) {
      setError(t('ajustes.emailPlaceholder'))
      return
    }
    setGenerando(true)
    setError('')
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setError(t('ajustes.noAutenticado')); setGenerando(false); return }

      const token = crypto.randomUUID()
      const link = `${window.location.origin}/register?invitado=true&email=${encodeURIComponent(emailInvitado)}&token=${token}&propietario=${user.id}`
      setShareLink(link)
    } catch {
      setError(t('ajustes.errorEnlace'))
    }
    setGenerando(false)
  }

  const copiarEnlace = async () => {
    try {
      await navigator.clipboard.writeText(shareLink)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    } catch {
      /* fallback */
      const input = document.createElement('input')
      input.value = shareLink
      document.body.appendChild(input)
      input.select()
      document.execCommand('copy')
      document.body.removeChild(input)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    }
  }

  return (
    <>
      <Button variant="outline" size="sm" className="gap-2" onClick={() => setOpen(true)}>
        <Share2 className="h-4 w-4" />
        {t('ajustes.compartir')}
      </Button>
      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setShareLink(''); setNombreInvitado(''); setEmailInvitado(''); setError('') } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('ajustes.compartirCon')}</DialogTitle>
            <DialogDescription>
              {t('ajustes.descripcionCompartir')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {!shareLink ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="share-nombre">{t('ajustes.nombreOpcional')}</Label>
                  <Input
                    id="share-nombre"
                    value={nombreInvitado}
                    onChange={e => setNombreInvitado(e.target.value)}
                    placeholder="María García"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="share-email">{t('ajustes.emailDestinatario')}</Label>
                  <Input
                    id="share-email"
                    type="email"
                    value={emailInvitado}
                    onChange={e => setEmailInvitado(e.target.value)}
                    placeholder="maria@ejemplo.com"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {t('ajustes.descripcionDestinatario')}
                </p>
                {error && <p className="text-sm text-destructive">{error}</p>}
              </>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  {t('ajustes.enlaceGenerado')} {nombreInvitado || emailInvitado}:
                </p>
                <div className="flex items-center gap-2">
                  <Input
                    readOnly
                    value={shareLink}
                    className="font-mono text-xs"
                    onClick={e => (e.target as HTMLInputElement).select()}
                  />
                  <Button variant="outline" size="icon" className="shrink-0" onClick={copiarEnlace}>
                    {copiado ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  {t('ajustes.enlaceUnUso')}
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>{t('header.cerrar')}</Button>
            {!shareLink && (
              <Button onClick={handleGenerarEnlace} disabled={generando || !emailInvitado.trim()}>
                {generando ? t('ajustes.generando') : t('ajustes.generarEnlace')}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
