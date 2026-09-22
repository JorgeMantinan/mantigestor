'use client'

import { useLanguage } from '@/contexts/language-context'
import { useAuth } from '@/hooks/useAuth'
import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Copy, Check, Users, Gift, Clock, Mail } from 'lucide-react'

interface ReferralStats {
  codigo: string
  totalInvitaciones: number
  aceptadas: number
  pendientes: number
  invitaciones: Array<{
    id: string
    email: string
    aceptada: boolean
    createdAt: string
  }>
}

export default function ReferidosPage() {
  const { t } = useLanguage()
  const { user } = useAuth()
  const [stats, setStats] = useState<ReferralStats | null>(null)
  const [email, setEmail] = useState('')
  const [nombre, setNombre] = useState('')
  const [loading, setLoading] = useState(true)
  const [enviando, setEnviando] = useState(false)
  const [copiado, setCopiado] = useState(false)
  const [error, setError] = useState('')
  const [exito, setExito] = useState('')

  const cargarStats = useCallback(async () => {
    try {
      const res = await fetch('/api/fiscal/referidos')
      if (res.ok) {
        const data = await res.json()
        setStats(data)
      }
    } catch {
      console.error('Error al cargar estadísticas de referidos')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (user) cargarStats()
  }, [user, cargarStats])

  const copiarCodigo = async () => {
    if (!stats?.codigo) return
    await navigator.clipboard.writeText(stats.codigo)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2000)
  }

  const copiarEnlace = async () => {
    if (!stats?.codigo) return
    const enlace = `${window.location.origin}/register?ref=${stats.codigo}`
    await navigator.clipboard.writeText(enlace)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2000)
  }

  const enviarInvitacion = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return

    setEnviando(true)
    setError('')
    setExito('')

    try {
      const res = await fetch('/api/fiscal/referidos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), nombre: nombre.trim() || undefined }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Error al enviar invitación')
        return
      }

      setExito(`Invitación enviada a ${email}`)
      setEmail('')
      setNombre('')
      cargarStats()
    } catch {
      setError('Error de conexión')
    } finally {
      setEnviando(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-muted-foreground">{t('common.cargando') || 'Cargando...'}</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          {t('referrals.title') || 'Programa de Referidos'}
        </h1>
        <p className="text-muted-foreground">
          {t('referrals.description') || 'Invita a otros profesionales y obtén 1 mes PRO por cada referido'}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('referrals.totalInvited') || 'Total Invitados'}
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalInvitaciones ?? 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('referrals.accepted') || 'Aceptados'}
            </CardTitle>
            <Check className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats?.aceptadas ?? 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('referrals.pending') || 'Pendientes'}
            </CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats?.pendientes ?? 0}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5" />
            {t('referrals.yourCode') || 'Tu Código de Referido'}
          </CardTitle>
          <CardDescription>
            {t('referrals.codeDescription') || 'Comparte este código con otros profesionales'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <code className="flex-1 rounded-md bg-muted px-4 py-2 text-lg font-mono font-bold text-center">
              {stats?.codigo || 'Cargando...'}
            </code>
            <Button variant="outline" size="icon" onClick={copiarCodigo}>
              {copiado ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
          <Button variant="outline" className="w-full" onClick={copiarEnlace}>
            {t('referrals.copyLink') || 'Copiar Enlace de Registro'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            {t('referrals.sendInvitation') || 'Enviar Invitación'}
          </CardTitle>
          <CardDescription>
            {t('referrals.invitationDescription') || 'Invita directamente por email'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={enviarInvitacion} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="nombre">{t('common.nombre') || 'Nombre'}</Label>
                <Input
                  id="nombre"
                  value={nombre}
                  onChange={e => setNombre(e.target.value)}
                  placeholder={t('referrals.namePlaceholder') || 'Nombre (opcional)'}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder={t('referrals.emailPlaceholder') || 'email@ejemplo.com'}
                  required
                />
              </div>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
            {exito && <p className="text-sm text-green-600">{exito}</p>}

            <Button type="submit" disabled={enviando || !email.trim()}>
              {enviando
                ? (t('common.enviando') || 'Enviando...')
                : (t('referrals.send') || 'Enviar Invitación')}
            </Button>
          </form>
        </CardContent>
      </Card>

      {stats?.invitaciones && stats.invitaciones.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t('referrals.history') || 'Historial de Invitaciones'}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {stats.invitaciones.map(inv => (
                <div key={inv.id} className="flex items-center justify-between rounded-md border p-3">
                  <div className="flex items-center gap-3">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{inv.email}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(inv.createdAt).toLocaleDateString('es-ES')}
                      </p>
                    </div>
                  </div>
                  <Badge variant={inv.aceptada ? 'default' : 'secondary'}>
                    {inv.aceptada
                      ? (t('referrals.acceptedBadge') || 'Aceptada')
                      : (t('referrals.pendingBadge') || 'Pendiente')}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
