'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
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
} from 'lucide-react'
import { useState } from 'react'

const menuItems = [
  {
    group: 'Gestoría',
    items: [
      { label: 'Panel', href: '/dashboard', icon: LayoutDashboard },
      { label: 'Facturas', href: '/gestoria/facturas', icon: Receipt },
      { label: 'Trimestres', href: '/gestoria/trimestres', icon: BarChart3 },
      { label: 'Renta', href: '/gestoria/renta', icon: Landmark },
      { label: 'Alquiler', href: '/alquiler', icon: Home },
      { label: 'Nóminas', href: '/nominas', icon: Users },
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
      { label: 'Ajustes', href: '/ajustes', icon: Settings },
    ],
  },
]

export function Sidebar() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  return (
    <aside
      className={cn(
        'flex flex-col border-r bg-sidebar transition-all duration-300',
        collapsed ? 'w-16' : 'w-64'
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
                  const isActive = pathname === item.href
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
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <>
              <ChevronLeft className="h-4 w-4 mr-2" />
              Colapsar
            </>
          )}
        </Button>
      </div>
    </aside>
  )
}
