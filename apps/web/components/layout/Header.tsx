'use client'

import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { NotificationDropdown } from '@/components/notifications/NotificationDropdown'
import { useLanguage } from '@/contexts/language-context'
import { HeaderAlertasIVA } from '@/components/header-alertas-iva'
import { PersonaSelector } from './persona-selector'
import { EmpresaSelector } from './empresa-selector'
import { LanguageSwitcher } from '@/components/language-switcher'
import { LogOut, User, Settings, CreditCard } from 'lucide-react'
import Link from 'next/link'
import { SearchTrigger } from '@/components/search/search-trigger'

export function Header() {
  const { user } = useAuth()
  const { t } = useLanguage()

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()

    // Purgar TODO dato privado cacheado en el navegador (equipo compartido):
    // Cache Storage del service worker, localStorage (facturas, chat, offline,
    // fiscal...) y sessionStorage. Solo se conservan preferencias inertes.
    try {
      await Promise.all((await caches.keys()).map(k => caches.delete(k)))
    } catch {}
    try {
      const conservar = new Set([
        'idioma',
        'theme',
        'onboarding_dismissed',
        'mantigestor_onboarding_completado',
        'milestone-100-seen',
      ])
      const borrar: string[] = []
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i)
        if (k && !conservar.has(k)) borrar.push(k)
      }
      borrar.forEach(k => localStorage.removeItem(k))
    } catch {}
    try {
      sessionStorage.clear()
    } catch {}

    window.location.href = '/login'
  }

  return (
    <header className="flex h-14 items-center gap-2 border-b bg-background px-14 sm:gap-4 sm:px-6">
      <div className="flex min-w-0 flex-1 items-center justify-end gap-0.5 sm:gap-2">
        {user && <SearchTrigger />}
        {user && <LanguageSwitcher />}
        {user && <EmpresaSelector />}
        {user && <PersonaSelector />}
        {user && <HeaderAlertasIVA />}
        {user && <NotificationDropdown />}
        {user ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 shrink-0 rounded-full p-0 text-muted-foreground">
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarFallback>
                    {user.email?.charAt(0).toUpperCase() ?? 'U'}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{user.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/ajustes">
                  <User className="mr-2 h-4 w-4" />
                  {t('header.miPerfil')}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/precios">
                  <CreditCard className="mr-2 h-4 w-4" />
                  {t('header.planFacturacion')}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/ajustes">
                  <Settings className="mr-2 h-4 w-4" />
                  {t('header.ajustes')}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                {t('header.cerrarSesion')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Button asChild>
            <Link href="/login">{t('header.iniciarSesion')}</Link>
          </Button>
        )}
      </div>
    </header>
  )
}
