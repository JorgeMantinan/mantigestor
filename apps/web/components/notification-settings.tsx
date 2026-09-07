'use client'

import { useEffect, useState, useCallback } from 'react'
import { useLanguage } from '@/contexts/language-context'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Bell, BellOff, Loader2 } from 'lucide-react'
import {
  isPushSupported,
  getPushPermission,
  subscribeToPush,
  unsubscribeFromPush,
  getExistingSubscription,
  subscriptionToJSON,
} from '@/lib/push-notifications'

export function NotificationSettings() {
  const [supported, setSupported] = useState(false)
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [subscribed, setSubscribed] = useState(false)
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState(false)
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
      <CardContent>
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
          <p className="mt-3 text-xs text-destructive">
            {t('notificationSettings.permisoDenegado')}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
