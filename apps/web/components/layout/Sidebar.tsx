'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  LayoutDashboard,
  Receipt,
  BarChart3,
  Landmark,
  GraduationCap,
  FileText,
  Home,
  Settings,
  FileSpreadsheet,
  PiggyBank,
  Users,
  ChevronLeft,
  ChevronRight,
  Calculator,
  Menu,
  X,
  FolderOpen,
  Bell,
  Calendar,
  Upload,
  Clock,
  Download,
  History,
  RefreshCw,
  BookOpen,
  Repeat,
  Zap,
} from 'lucide-react'
import { useState } from 'react'
import { usePersonaActiva } from '@/contexts/persona-activa-context'
import { useLanguage } from '@/contexts/language-context'
import { Badge } from '@/components/ui/badge'

export function Sidebar() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const { esPropio } = usePersonaActiva()
  const { t } = useLanguage()

  const menuItems = [
    {
      group: t('nav.gestoria'),
      items: [
        { label: t('nav.panel'), href: '/dashboard', icon: LayoutDashboard },
        { label: t('nav.expediente'), href: '/gestoria/expediente', icon: FolderOpen },
        { label: t('nav.agenda'), href: '/gestoria/agenda', icon: Calendar },
        { label: t('nav.facturas'), href: '/gestoria/facturas', icon: Receipt },
        { label: t('nav.proformas'), href: '/gestoria/facturas/proformas', icon: FileText },
        { label: t('nav.trimestres'), href: '/gestoria/trimestres', icon: BarChart3 },
        { label: t('nav.renta'), href: '/gestoria/renta', icon: Landmark },
        { label: t('nav.packAnual'), href: '/gestoria/pack-anual', icon: FileText },
        { label: t('nav.reporteAnual'), href: '/gestoria/reporte-anual', icon: FileSpreadsheet },
        { label: t('nav.importarExtracto'), href: '/gestoria/importar-extracto', icon: Upload },
        { label: t('nav.fiscal'), href: '/fiscal', icon: Calculator },
        { label: t('nav.alquiler'), href: '/alquiler', icon: Home },
        { label: t('nav.nominas'), href: '/nominas', icon: Users },
      ],
    },
    {
      group: t('nav.modelosRapidos'),
      items: [
        { label: t('nav.ivaTrimestral303'), href: '/fiscal?seccion=modelo303', icon: Receipt },
        { label: t('nav.pagoFraccionado130'), href: '/fiscal?seccion=modelo130', icon: Landmark },
        { label: t('nav.retenciones111'), href: '/fiscal?seccion=modelo111', icon: Receipt },
        { label: t('nav.rentaAnual100'), href: '/fiscal?seccion=modelo100', icon: FileText },
        { label: t('nav.retaAutonomos'), href: '/fiscal?seccion=reta', icon: Users },
      ],
    },
    {
      group: t('nav.gestoria'),
      items: [
        { label: t('nav.facturas'), href: '/gestoria/facturas', icon: Receipt },
        { label: t('nav.cobros'), href: '/gestoria/cobros', icon: Landmark },
        { label: t('nav.documentos'), href: '/gestoria/documentos', icon: FileText },
        { label: t('nav.informes'), href: '/gestoria/informes', icon: FileSpreadsheet },
        { label: t('nav.conciliacion'), href: '/gestoria/conciliacion', icon: RefreshCw },
        { label: t('nav.presupuestos'), href: '/gestoria/presupuestos', icon: PiggyBank },
        { label: t('nav.informeTrimestral'), href: '/gestoria/informe-trimestral', icon: FileSpreadsheet },
        { label: t('nav.backup'), href: '/gestoria/backup', icon: Download },
        { label: t('nav.registro'), href: '/gestoria/audit-log', icon: History },
      ],
    },
    {
      group: t('nav.alumnos'),
      items: [
        { label: t('nav.documentos'), href: '/alumnos', icon: FileText },
        { label: t('nav.examenes'), href: '/alumnos/examenes', icon: GraduationCap },
      ],
    },
    {
      group: t('nav.herramientas'),
      items: [
        { label: t('nav.ia'), href: '/ai', icon: PiggyBank },
        { label: t('nav.conversiones'), href: '/conversiones', icon: FileSpreadsheet },
        { label: t('nav.dividirGasto'), href: '/herramientas/dividir-gasto', icon: Users },
        { label: t('nav.temporizador'), href: '/herramientas/temporizador', icon: Clock },
        { label: t('nav.pagosRecurrentes'), href: '/herramientas/pagos-recurrentes', icon: Repeat },
        { label: t('nav.simuladorRetenciones'), href: '/herramientas/simulador-retenciones', icon: Calculator },
        { label: t('nav.googleCalendar'), href: '/herramientas/google-calendar', icon: Calendar },
        { label: t('nav.automatizaciones'), href: '/herramientas/automatizaciones', icon: Zap },
        { label: t('nav.notificaciones'), href: '/ajustes/notificaciones', icon: Bell },
        { label: t('nav.apiDocs'), href: '/api-docs', icon: BookOpen },
        { label: t('nav.ajustes'), href: '/ajustes', icon: Settings },
      ],
    },
  ]

  return (
    <>
      <Button
        variant="outline"
        size="icon"
        className="fixed left-4 top-3 z-50 lg:hidden"
        onClick={() => setMobileOpen(!mobileOpen)}
        aria-label={mobileOpen ? 'Cerrar menú' : 'Abrir menú'}
        aria-expanded={mobileOpen}
      >
        {mobileOpen ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
      </Button>

      {mobileOpen && (
        <div className="fixed inset-0 z-30 bg-black/50 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      <aside
        className={cn(
          'flex flex-col border-r bg-sidebar transition-all duration-300',
          'hidden lg:flex',
          collapsed ? 'lg:w-16' : 'lg:w-64',
          mobileOpen && '!flex fixed inset-y-0 left-0 z-40 w-64'
        )}
      >
        <div className="flex h-14 items-center gap-2 border-b px-4">
          <div className={cn('flex items-center gap-2', collapsed && 'justify-center w-full')}>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <span className="text-sm font-bold text-primary-foreground">M</span>
            </div>
            {!collapsed && (
              <span className="font-heading text-lg font-semibold">MantiGestor</span>
            )}
          </div>
        </div>

        {!esPropio && !collapsed && (
          <div className="mx-3 mb-2">
            <Badge variant="outline" className="w-full justify-center text-xs">
              {t('nav.gestionandoOtraPersona')}
            </Badge>
          </div>
        )}

        <div className="flex-1 overflow-y-auto py-4">
          <nav className="flex flex-col gap-6 px-3">
            {menuItems.map((group) => (
              <div key={group.group}>
                {!collapsed && (
                  <p className="mb-2 px-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    {group.group}
                  </p>
                )}
                <div className="flex flex-col gap-1">
                  {group.items.map((item) => {
                    const isActive = item.href === '/'
                      ? pathname === '/' || pathname === '/dashboard'
                      : pathname === item.href || pathname.startsWith(item.href + '/')
                    return (
                      <Button
                        key={item.href}
                        variant={isActive ? 'secondary' : 'ghost'}
                        size={collapsed ? 'icon' : 'default'}
                        className={cn(
                          'justify-start',
                          collapsed ? 'h-10 w-10 mx-auto' : 'px-3'
                        )}
                        asChild
                      >
                        <Link href={item.href}>
                          <item.icon className={cn('h-4 w-4', !collapsed && 'mr-3')} />
                          {!collapsed && item.label}
                        </Link>
                      </Button>
                    )
                  })}
                </div>
              </div>
            ))}
          </nav>
        </div>

        <div className="border-t p-3">
          <Button
            variant="ghost"
            size={collapsed ? 'icon' : 'default'}
            className={cn('w-full', collapsed && 'mx-auto')}
            onClick={() => setCollapsed(!collapsed)}
            aria-label={collapsed ? 'Expandir menú' : 'Colapsar menú'}
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            ) : (
              <>
                <ChevronLeft className="h-4 w-4 mr-2" aria-hidden="true" />
                {t('nav.colapsar')}
              </>
            )}
          </Button>
        </div>
      </aside>

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background lg:hidden" aria-label="Navegación móvil">
        <div className="flex items-center justify-around py-2">
          {[
            { label: t('nav.panel'), href: '/dashboard', icon: LayoutDashboard },
            { label: t('nav.facturas'), href: '/gestoria/facturas', icon: Receipt },
            { label: t('nav.fiscal'), href: '/fiscal', icon: Calculator },
            { label: t('nav.nominas'), href: '/nominas', icon: FileText },
            { label: t('nav.alquiler'), href: '/alquiler', icon: Home },
            { label: t('nav.ajustes'), href: '/ajustes', icon: Settings },
          ].map(item => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <Link key={item.href} href={item.href}
                className={cn(
                  'flex flex-col items-center gap-1 px-3 py-1 text-xs',
                  isActive ? 'text-primary' : 'text-muted-foreground'
                )}>
                <item.icon className="h-5 w-5" aria-hidden="true" />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </div>
      </nav>
    </>
  )
}
