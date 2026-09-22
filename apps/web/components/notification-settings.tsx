'use client'

import { useEffect, useState, useCallback } from 'react'
import { useLanguage } from '@/contexts/language-context'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Bell, BellOff, Loader2, CalendarClock, FileText, CreditCard } from 'lucide-react'
import {
  isPushSupported,
  getPushPermission,
  subscribeToPush,
  unsubscribeFromPush,
  getExistingSubscription,
  subscriptionToJSON,
} from '@/lib/push-notifications'

interface NotificationPreference {
  canal: string
  categoria: string
  diasAntelacion: number
  activo: boolean
}

const CATEGORIES = [
  { key: 'fiscal', label: 'Plazos fiscales', icon: CalendarClock },
  { key: 'facturas', label: 'Recordatorios de factura', icon: FileText },
  { key: 'pagos', label: 'Pagos recibidos', icon: CreditCard },
] as const

export function NotificationSettings() {
  const [supported, setSupported] = useState(false)
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [subscribed, setSubscribed] = useState(false)
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState(false)
  const [preferences, setPreferences] = useState<NotificationPreference[]>([])
  const [savingPref, setSavingPref] = useState(false)
  const { t } = useLanguage()

  const loadState = useCallback(async () => {
    const pushSupported = isPushSupported()
    setSupported(pushSupported)
    if (!pushSupported) {
      setLoading(false)
      return
    }
    setPermission(getPushPermission())
    const existing = await getExistingSubscription()
    setSubscribed(!!existing)

    try {
      const res = await fetch('/api/fiscal/preferencias-notificaciones')
      if (res.ok) {
        const data = await res.json()
        setPreferences(data.preferencias ?? [])
      }
    } catch {
      // silent
    }

    setLoading(false)
  }, [])

  useEffect(() => {
    loadState()
  }, [loadState])

  async function handleToggle(checked: boolean) {
    if (!supported || toggling) return
    setToggling(true)

    try {
      if (checked) {
        const registration = await navigator.serviceWorker.ready
        const subscription = await subscribeToPush(registration)
        if (subscription) {
          await fetch('/api/push-subscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ subscription: subscriptionToJSON(subscription) }),
          })
          setSubscribed(true)
          setPermission('granted')
        }
      } else {
        await unsubscribeFromPush()
        await fetch('/api/push-unsubscribe', { method: 'POST' })
        setSubscribed(false)
      }
    } catch {
      // silent
    } finally {
      setToggling(false)
    }
  }

  async function handleCategoryToggle(categoria: string, activo: boolean) {
    setSavingPref(true)
    try {
      const existing = preferences.find(p => p.categoria === categoria && p.canal === 'in_app')
      const updated = existing ? { ...existing, activo } : { canal: 'in_app', categoria, diasAntelacion: 15, activo }
      const newPrefs = activo
        ? [...preferences.filter(p => !(p.categoria === categoria && p.canal === 'in_app')), updated]
        : preferences.filter(p => !(p.categoria === categoria && p.canal === 'in_app'))

      setPreferences(newPrefs)

      await fetch('/api/fiscal/preferencias-notificaciones', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preferencias: newPrefs }),
      })
    } catch {
      // silent
    } finally {
      setSavingPref(false)
    }
  }

  function isCategoryActive(categoria: string): boolean {
    const pref = preferences.find(p => p.categoria === categoria && p.canal === 'in_app')
    return pref?.activo ?? true
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  if (!supported) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BellOff className="h-4 w-4" aria-hidden="true" />
            {t('notificationSettings.notificacionesPush')}
          </CardTitle>
          <CardDescription>
            {t('notificationSettings.navegadorNoSoporta')}
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Bell className="h-4 w-4" aria-hidden="true" />
          {t('notificationSettings.notificacionesPush')}
        </CardTitle>
        <CardDescription>
          {t('notificationSettings.recibeAlertas')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{t('notificationSettings.activarNotificaciones')}</span>
              <Badge variant={subscribed ? 'default' : 'secondary'}>
                {subscribed ? t('notificationSettings.activado') : t('notificationSettings.desactivado')}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              {t('notificationSettings.estadoPermiso')}: {permission === 'granted' ? t('notificationSettings.concedido') : permission === 'denied' ? t('notificationSettings.denegado') : t('notificationSettings.sinSolicitar')}
            </p>
          </div>
          <Switch
            checked={subscribed}
            onCheckedChange={handleToggle}
            disabled={toggling || permission === 'denied'}
          />
        </div>
        {permission === 'denied' && (
          <p className="text-xs text-destructive">
            {t('notificationSettings.permisoDenegado')}
          </p>
        )}

        {subscribed && (
          <div className="border-t pt-4 space-y-3">
            <p className="text-sm font-medium">Categorías de notificación</p>
            {CATEGORIES.map(({ key, label, icon: Icon }) => (
              <div key={key} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  <span className="text-sm">{label}</span>
                </div>
                <Switch
                  checked={isCategoryActive(key)}
                  onCheckedChange={(checked) => handleCategoryToggle(key, checked)}
                  disabled={savingPref}
                />
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
