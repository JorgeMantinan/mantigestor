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
} from 'lucide-react'
import { useState } from 'react'
import { usePersonaActiva } from '@/contexts/persona-activa-context'
import { Badge } from '@/components/ui/badge'

const menuItems = [
  {
    group: 'Gestoría',
    items: [
      { label: 'Panel', href: '/dashboard', icon: LayoutDashboard },
      { label: 'Expediente', href: '/gestoria/expediente', icon: FolderOpen },
      { label: 'Agenda', href: '/gestoria/agenda', icon: Calendar },
      { label: 'Facturas', href: '/gestoria/facturas', icon: Receipt },
      { label: 'Trimestres', href: '/gestoria/trimestres', icon: BarChart3 },
      { label: 'Renta', href: '/gestoria/renta', icon: Landmark },
      { label: 'Pack anual', href: '/gestoria/pack-anual', icon: FileText },
      { label: 'Importar extracto', href: '/gestoria/importar-extracto', icon: Upload },
      { label: 'Fiscal', href: '/fiscal', icon: Calculator },
      { label: 'Alquiler', href: '/alquiler', icon: Home },
      { label: 'Nóminas', href: '/nominas', icon: Users },
    ],
  },
  {
    group: 'Modelos rápidos',
    items: [
      { label: 'IVA trimestral (303)', href: '/fiscal?seccion=modelo303', icon: Receipt },
      { label: 'Pago fraccionado (130)', href: '/fiscal?seccion=modelo130', icon: Landmark },
      { label: 'Retenciones (111)', href: '/fiscal?seccion=modelo111', icon: Receipt },
      { label: 'Renta anual (100)', href: '/fiscal?seccion=modelo100', icon: FileText },
      { label: 'Reta (autónomos)', href: '/fiscal?seccion=reta', icon: Users },
    ],
  },
  {
    group: 'Alumnos',
    items: [
      { label: 'Documentos', href: '/alumnos', icon: FileText },
      { label: 'Exámenes', href: '/alumnos/examenes', icon: GraduationCap },
    ],
  },
  {
    group: 'Herramientas',
    items: [
      { label: 'IA', href: '/ai', icon: PiggyBank },
      { label: 'Conversiones', href: '/conversiones', icon: FileSpreadsheet },
      { label: 'Dividir gasto', href: '/herramientas/dividir-gasto', icon: Users },
      { label: 'Notificaciones', href: '/ajustes/notificaciones', icon: Bell },
      { label: 'Ajustes', href: '/ajustes', icon: Settings },
    ],
  },
]

export function Sidebar() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const { esPropio } = usePersonaActiva()

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
              Gestionando a otra persona
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
                Colapsar
              </>
            )}
          </Button>
        </div>
      </aside>

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background lg:hidden" aria-label="Navegación móvil">
        <div className="flex items-center justify-around py-2">
          {[
            { label: 'Panel', href: '/dashboard', icon: LayoutDashboard },
            { label: 'Facturas', href: '/gestoria/facturas', icon: Receipt },
      { label: 'Fiscal', href: '/fiscal', icon: Calculator },
      { label: 'Asistente Fiscal', href: '/fiscal/asistente', icon: Calculator },
            { label: 'Alquiler', href: '/alquiler', icon: Home },
            { label: 'Ajustes', href: '/ajustes', icon: Settings },
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
