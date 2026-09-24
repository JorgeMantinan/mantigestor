'use client'

import { useNotifications } from '@/hooks/useNotifications'
import { useLanguage } from '@/contexts/language-context'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Bell, BellRing, CheckCheck, Dot, FileText, AlertTriangle, Info, DollarSign, Users } from 'lucide-react'

function getIcon(tipo: string) {
  switch (tipo) {
    case 'factura':
      return <FileText className="h-4 w-4 text-blue-500" />
    case 'alerta':
      return <AlertTriangle className="h-4 w-4 text-amber-500" />
    case 'pago':
      return <DollarSign className="h-4 w-4 text-green-500" />
    case 'usuario':
      return <Users className="h-4 w-4 text-purple-500" />
    default:
      return <Info className="h-4 w-4 text-muted-foreground" />
  }
}

function tiempoRelativo(fecha: string, t: (key: string) => string): string {
  const ahora = new Date()
  const date = new Date(fecha)
  const diffMs = ahora.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  const diffHoras = Math.floor(diffMs / 3600000)
  const diffDias = Math.floor(diffMs / 86400000)

  if (diffMin < 1) return t('notificationDropdown.haceUnMomento')
  if (diffMin < 60) return t('notificationDropdown.haceMin').replace('{min}', String(diffMin))
  if (diffHoras < 24) return t('notificationDropdown.haceHoras').replace('{horas}', String(diffHoras))
  return t('notificationDropdown.haceDias').replace('{dias}', String(diffDias))
}

export function NotificationDropdown() {
  const { notificaciones, noLeidas, cargando, markAsRead, markAllAsRead } = useNotifications()
  const { t } = useLanguage()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 shrink-0 text-muted-foreground" aria-label={`${t('notificationDropdown.notificaciones')}${noLeidas > 0 ? ` (${noLeidas}${t('notificationDropdown.sinLeer')})` : ''}`}>
          {noLeidas > 0 ? (
            <BellRing className="h-5 w-5 text-yellow-500" aria-hidden="true" />
          ) : (
            <Bell className="h-5 w-5" aria-hidden="true" />
          )}
          {noLeidas > 0 && (
            <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-medium text-destructive-foreground">
              {noLeidas > 9 ? '9+' : noLeidas}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-[320px] max-h-[400px] overflow-y-auto" align="end" forceMount>
        {cargando ? (
          <div className="flex items-center justify-center py-6 text-sm text-muted-foreground">
            {t('notificationDropdown.cargando')}
          </div>
        ) : notificaciones.length === 0 ? (
          <div className="flex items-center justify-center py-6 text-sm text-muted-foreground">
            {t('notificationDropdown.noHayNotificaciones')}
          </div>
        ) : (
          <>
            {notificaciones.slice(0, 20).map((notif) => (
              <DropdownMenuItem
                key={notif.id}
                className="flex items-start gap-3 px-4 py-3 cursor-pointer"
                onClick={() => !notif.leido && markAsRead(notif.id)}
              >
                <div className="mt-0.5">{getIcon(notif.tipo)}</div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm leading-tight ${!notif.leido ? 'font-medium' : ''}`}>
                    {notif.contenido.length > 80
                      ? `${notif.contenido.slice(0, 80)}...`
                      : notif.contenido}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {tiempoRelativo(notif.creadoEn, t)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  {!notif.leido && <Dot className="h-5 w-5 text-blue-500" />}
                </div>
              </DropdownMenuItem>
            ))}
            {notificaciones.length > 20 && (
              <div className="px-4 py-2 text-center text-xs text-muted-foreground">
                +{notificaciones.length - 20} {t('notificationDropdown.mas')}
              </div>
            )}
            {noLeidas > 0 && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="flex items-center justify-center gap-2 text-sm font-medium cursor-pointer"
                  onClick={markAllAsRead}
                >
                  <CheckCheck className="h-4 w-4" />
                  {t('notificationDropdown.marcarTodasLeidas')}
                </DropdownMenuItem>
              </>
            )}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
