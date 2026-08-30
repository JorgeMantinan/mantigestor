'use client'

import { useEffect, useState, useCallback } from 'react'
import { useTheme } from 'next-themes'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Users } from 'lucide-react'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { createClient } from '@/lib/supabase/client'

type Tab = 'perfil' | 'suscripcion' | 'apariencia'

export default function AjustesPage() {
  const [tab, setTab] = useState<Tab>('perfil')

  const tabs: { value: Tab; label: string }[] = [
    { value: 'perfil', label: 'Perfil' },
    { value: 'suscripcion', label: 'Suscripción' },
    { value: 'apariencia', label: 'Apariencia' },
  ]

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="text-3xl font-heading font-bold tracking-tight">Ajustes</h1>
        <p className="text-muted-foreground">Gestiona tu cuenta y preferencias</p>
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
            <CardTitle>Personas asociadas</CardTitle>
            <CardDescription>Gestiona las personas cuyos asuntos fiscales gestionas</CardDescription>
          </div>
          <Link href="/ajustes/personas">
            <Button variant="outline" size="sm" className="gap-2">
              <Users className="h-4 w-4" />
              Ver personas
            </Button>
          </Link>
        </CardHeader>
      </Card>
    </div>
  )
}

function PerfilTab() {
  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [nif, setNif] = useState('')
  const [provincia, setProvincia] = useState('')
  const [situacion, setSituacion] = useState('')
  const [empresaNombre, setEmpresaNombre] = useState('')
  const [empresaNif, setEmpresaNif] = useState('')
  const [empresaDireccion, setEmpresaDireccion] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [cargando, setCargando] = useState(true)
  const getSupabase = useCallback(() => createClient(), [])

  useEffect(() => {
    const cargar = async () => {
      const { data: { user } } = await getSupabase().auth.getUser()
      if (!user) { setCargando(false); return }
      setEmail(user.email ?? '')

      const { data } = await getSupabase()
        .from('perfiles')
        .select('nombre, nif, provincia, situacion, empresa_nombre, empresa_nif, empresa_direccion')
        .eq('id', user.id)
        .single()

      if (data) {
        setNombre(data.nombre ?? '')
        setNif(data.nif ?? '')
        setProvincia(data.provincia ?? '')
        setSituacion(data.situacion ?? '')
        setEmpresaNombre(data.empresa_nombre ?? '')
        setEmpresaNif(data.empresa_nif ?? '')
        setEmpresaDireccion(data.empresa_direccion ?? '')
      }
      setCargando(false)
    }
    cargar()
  }, [getSupabase])

  const guardar = async () => {
    setGuardando(true)
    const { data: { user } } = await getSupabase().auth.getUser()
    if (!user) { setGuardando(false); return }

    const { error } = await getSupabase()
      .from('perfiles')
      .upsert({ id: user.id, nombre, nif, provincia, situacion, empresa_nombre: empresaNombre, empresa_nif: empresaNif, empresa_direccion: empresaDireccion })
      .eq('id', user.id)

    if (error) {
      console.error('Error guardando perfil:', error)
    }
    setGuardando(false)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Información personal</CardTitle>
        <CardDescription>Actualiza tus datos fiscales y de contacto</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {cargando ? (
          <p className="text-sm text-muted-foreground">Cargando perfil...</p>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="nombre">Nombre completo</Label>
                <Input id="nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Tu nombre" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} disabled />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="nif">NIF / CIF</Label>
                <Input id="nif" value={nif} onChange={(e) => setNif(e.target.value)} placeholder="12345678Z" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="provincia">Provincia fiscal</Label>
                <Input id="provincia" value={provincia} onChange={(e) => setProvincia(e.target.value)} placeholder="Madrid" />
              </div>
            </div>
            <Separator />
            <div className="space-y-2">
              <Label htmlFor="situacion">Situación laboral</Label>
              <select
                id="situacion"
                value={situacion}
                onChange={(e) => setSituacion(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="">Selecciona...</option>
                <option value="autonomo_puro">Autónomo (solo)</option>
                <option value="autonomo_con_nomina">Autónomo con nómina</option>
                <option value="asalariado">Asalariado</option>
                <option value="pensionista">Pensionista</option>
                <option value="desempleado">Desempleado</option>
              </select>
            </div>
            <Separator />
            <div>
              <h3 className="text-sm font-medium mb-3">Datos de empresa (para facturas)</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="empresaNombre">Nombre de empresa</Label>
                  <Input id="empresaNombre" value={empresaNombre} onChange={(e) => setEmpresaNombre(e.target.value)} placeholder="Mi Empresa S.L." />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="empresaNif">NIF de empresa</Label>
                  <Input id="empresaNif" value={empresaNif} onChange={(e) => setEmpresaNif(e.target.value)} placeholder="B00000000" />
                </div>
              </div>
              <div className="mt-4 space-y-2">
                <Label htmlFor="empresaDireccion">Dirección fiscal</Label>
                <Input id="empresaDireccion" value={empresaDireccion} onChange={(e) => setEmpresaDireccion(e.target.value)} placeholder="Calle Ejemplo 123, 28001 Madrid" />
              </div>
            </div>
            <Button onClick={guardar} disabled={guardando || cargando}>
              {guardando ? 'Guardando...' : 'Guardar cambios'}
            </Button>
          </>
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
        <CardTitle>Suscripción</CardTitle>
        <CardDescription>Gestiona tu plan y método de pago</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg border bg-muted/50 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Plan actual</p>
              <p className="text-sm text-muted-foreground">
                {subLoading
                  ? 'Cargando...'
                  : isPro && isActive
                    ? 'Plan PRO activo'
                    : isPro && !isActive
                      ? 'Tu suscripción ha caducado'
                      : 'Plan BASIC gratuito'}
              </p>
            </div>
            <div className="rounded-full bg-yellow-100 px-3 py-1 text-xs font-semibold text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
              {subLoading ? '...' : isPro ? 'PRO' : 'BASIC'}
            </div>
          </div>
        </div>
        <div className="space-y-2">
          <Button variant="link" size="sm" onClick={sincronizar} disabled={subLoading}>
            {subLoading ? 'Sincronizando...' : 'Sincronizar suscripción'}
          </Button>
        </div>
        <div className="space-y-2">
          <Label>Método de pago</Label>
          <div className="flex gap-4">
            {isPro && isActive ? (
              <Button
                variant="outline"
                className="flex-1"
                onClick={handlePortal}
                disabled={loading === 'portal'}
              >
                {loading === 'portal' ? 'Cargando...' : stripeOk ? 'Gestionar suscripción' : 'Próximamente'}
              </Button>
            ) : (
              <Button
                variant="outline"
                className="flex-1"
                onClick={handleCheckout}
                disabled={loading === 'checkout'}
              >
                {loading === 'checkout' ? 'Redirigiendo...' : stripeOk ? 'Stripe' : 'Próximamente'}
              </Button>
            )}
            <Button variant="outline" className="flex-1" disabled>
              PayPal
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            {!stripeOk
              ? 'Los pagos online estarán disponibles pronto.'
              : isPro && isActive
                ? 'Gestiona tu suscripción y método de pago desde el portal de Stripe'
                : 'Al contratar disfrutarás de 30 días de prueba gratuita del plan PRO'}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

function AparienciaTab() {
  const { theme, setTheme } = useTheme()

  const themes: { value: string; label: string }[] = [
    { value: 'light', label: 'Claro' },
    { value: 'dark', label: 'Oscuro' },
    { value: 'system', label: 'Sistema' },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle>Apariencia</CardTitle>
        <CardDescription>Personaliza cómo ves MantiGestor</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Tema</Label>
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
