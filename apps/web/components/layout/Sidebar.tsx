'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { LayoutDashboard, Receipt, Landmark, FileText, Home, Settings, FileSpreadsheet, PiggyBank, Users, ChevronLeft, ChevronRight, Calculator, Menu, X, FolderOpen, Upload, Clock, Repeat, Zap, ListChecks, AlertTriangle, Camera, ClipboardList, Bell, Download, History, HelpCircle } from 'lucide-react'
import { useState, useEffect } from 'react'
import { usePersonaActiva } from '@/contexts/persona-activa-context'
import { useLanguage } from '@/contexts/language-context'
import { Badge } from '@/components/ui/badge'
import { getCalendarioFiscal } from '@mantigestor/utils'
import { SidebarGroupComponent } from './sidebar-group'
import { SearchTrigger } from '@/components/search/search-trigger'

function PlazosFiscalesWidget({ collapsed }: { collapsed: boolean }) {
  const [plazos, setPlazos] = useState<{ fecha: Date; nombre: string }[]>([])
  const { t } = useLanguage()

  useEffect(() => {
    const hoy = new Date()
    const calendario = getCalendarioFiscal(hoy.getFullYear())
    const proximos = calendario
      .filter(p => p.fechaLimite > hoy)
      .sort((a, b) => a.fechaLimite.getTime() - b.fechaLimite.getTime())
      .slice(0, 3)
      .map(p => ({ fecha: p.fechaLimite, nombre: p.descripcion }))
    if (proximos.length > 0) setPlazos(proximos)
  }, [])

  if (collapsed || plazos.length === 0) return null

  return (
    <div className="border-t p-4">
      <h4 className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
        <AlertTriangle className="h-3 w-3" aria-hidden="true" />
        {t('nav.proximosPlazos')}
      </h4>
      <div className="space-y-1">
        {plazos.map(p => (
          <div key={p.nombre} className="flex justify-between text-xs py-1">
            <span className="truncate mr-2">{p.nombre}</span>
            <span className="text-muted-foreground whitespace-nowrap">
              {p.fecha.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

type MenuItem = { label: string; href: string; icon: typeof LayoutDashboard; indicador?: string }

function buildMenuItems(
  t: (key: string) => string,
  tieneClientes: boolean,
): { group: string; items: MenuItem[]; defaultOpen: boolean }[] {
  const principal: MenuItem[] = [
    { label: t('nav.panel'), href: '/dashboard', icon: LayoutDashboard },
    { label: t('nav.facturas'), href: '/gestoria/facturas', icon: Receipt },
    { label: 'Proformas', href: '/gestoria/proformas', icon: FileText },
    { label: t('nav.nominas'), href: '/nominas', icon: Users, indicador: 'nomina' },
    { label: t('nav.alquiler'), href: '/alquiler', icon: Home, indicador: 'propiedad' },
    { label: t('nav.documentos'), href: '/gestoria/documentos', icon: FolderOpen, indicador: 'documento' },
  ]

  const fiscal: MenuItem[] = [
    { label: t('nav.ivaTrimestral303'), href: '/fiscal?seccion=modelo303', icon: Receipt },
    { label: t('nav.retenciones111'), href: '/fiscal?seccion=modelo111', icon: Receipt },
    { label: t('nav.pagoFraccionado130'), href: '/fiscal?seccion=modelo130', icon: Landmark },
    { label: t('nav.rentaAnual100'), href: '/fiscal?seccion=modelo100', icon: FileText },
    { label: t('nav.retaAutonomos'), href: '/fiscal?seccion=reta', icon: Users },
    { label: t('nav.fiscal'), href: '/fiscal', icon: Calculator },
  ]

  const herramientas: MenuItem[] = [
    { label: 'Mi primer trimestre', href: '/herramientas/primer-trimestre', icon: ClipboardList },
    { label: t('nav.ia'), href: '/ai', icon: PiggyBank },
    { label: t('nav.conversiones'), href: '/conversiones', icon: FileSpreadsheet },
    { label: 'Escanear ticket', href: '/herramientas/escanear-ticket', icon: Camera },
    { label: 'Importar datos', href: '/herramientas/importar-datos', icon: Upload },
    { label: t('nav.importarExtracto'), href: '/gestoria/importar-extracto', icon: Upload },
    { label: t('nav.simuladorRetenciones'), href: '/herramientas/simulador-retenciones', icon: Calculator },
    { label: t('nav.temporizador'), href: '/herramientas/temporizador', icon: Clock },
    { label: t('nav.pagosRecurrentes'), href: '/herramientas/pagos-recurrentes', icon: Repeat },
    { label: t('nav.automatizaciones'), href: '/herramientas/automatizaciones', icon: Zap },
    { label: t('nav.recordatorios'), href: '/herramientas/recordatorios', icon: ListChecks },
    { label: 'FAQ Fiscal', href: '/herramientas/faq', icon: HelpCircle },
  ]

  const asesor: MenuItem[] = tieneClientes
    ? [
        { label: 'Dashboard Consolidado', href: '/asesor/dashboard-consolidado', icon: LayoutDashboard },
        { label: 'Alertas Asesoría', href: '/asesor/alertas', icon: AlertTriangle },
        { label: 'Informes de Cliente', href: '/asesor/informes', icon: FileText },
      ]
    : []

  const configuracion: MenuItem[] = [
    { label: t('nav.ajustes'), href: '/ajustes', icon: Settings },
    { label: t('nav.notificaciones'), href: '/ajustes/notificaciones', icon: Bell },
    { label: t('nav.backup'), href: '/gestoria/backup', icon: Download },
    { label: t('nav.registro'), href: '/gestoria/audit-log', icon: History },
  ]

  const groups = [
    { group: 'Principal', items: principal, defaultOpen: true },
    { group: 'Fiscal', items: fiscal, defaultOpen: true },
    { group: 'Herramientas', items: herramientas, defaultOpen: false },
  ]

  if (asesor.length > 0) {
    groups.push({ group: 'Asesor', items: asesor, defaultOpen: false })
  }

  groups.push({ group: 'Configuración', items: configuracion, defaultOpen: false })

  return groups
}

export function Sidebar() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const { esPropio } = usePersonaActiva()
  const { t } = useLanguage()
  const { personas } = usePersonaActiva()
  const tieneClientes = personas.some(p => p.tipo === 'gestiono')
  const menuGroups = buildMenuItems(t, tieneClientes)

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
          <nav className="flex flex-col gap-5 px-3">
            {collapsed && (
              <SearchTrigger collapsed />
            )}
            {menuGroups.map((group) => (
              <SidebarGroupComponent
                key={group.group}
                group={group.group}
                items={group.items}
                collapsed={collapsed}
                pathname={pathname}
                defaultOpen={group.defaultOpen}
              />
            ))}
          </nav>
        </div>

        <PlazosFiscalesWidget collapsed={collapsed} />

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
      {!mobileOpen && (
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background lg:hidden" aria-label="Navegación móvil">
        <div className="flex items-center justify-around py-2">
          {[
            { label: t('nav.panel'), href: '/dashboard', icon: LayoutDashboard },
            { label: t('nav.facturas'), href: '/gestoria/facturas', icon: Receipt, indicador: 'factura' },
            { label: t('nav.fiscal'), href: '/fiscal', icon: Calculator },
            { label: t('nav.nominas'), href: '/nominas', icon: FileText },
            { label: t('nav.alquiler'), href: '/alquiler', icon: Home },
            { label: t('nav.ajustes'), href: '/ajustes', icon: Settings },
          ].map(item => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <Link key={item.href} href={item.href}
                className={cn(
                  'flex flex-col items-center gap-1 px-1 py-1 text-[10px] sm:px-3 sm:text-xs',
                  isActive ? 'text-primary' : 'text-muted-foreground'
                )}>
                <item.icon className="h-5 w-5" aria-hidden="true" />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </div>
      </nav>
      )}
    </>
  )
}
