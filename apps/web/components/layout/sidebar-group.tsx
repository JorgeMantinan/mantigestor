'use client'

import { useState } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ChevronDown } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

interface MenuItem {
  label: string
  href: string
  icon: LucideIcon
  indicador?: string
}

interface SidebarGroupProps {
  group: string
  items: MenuItem[]
  collapsed: boolean
  pathname: string
  defaultOpen?: boolean
}

export function SidebarGroupComponent({
  group,
  items,
  collapsed,
  pathname,
  defaultOpen = true,
}: SidebarGroupProps) {
  const [open, setOpen] = useState(defaultOpen)

  if (collapsed) {
    return (
      <div>
        <div className="flex flex-col gap-1">
          {items.map((item) => {
            const isActive =
              item.href === '/'
                ? pathname === '/' || pathname === '/dashboard'
                : pathname === item.href ||
                  pathname.startsWith(item.href + '/')
            return (
              <Button
                key={item.href}
                variant={isActive ? 'secondary' : 'ghost'}
                size="icon"
                className="h-10 w-10 mx-auto relative"
                asChild
              >
                <Link href={item.href} title={item.label}>
                  <item.icon className="h-4 w-4" aria-hidden="true" />
                </Link>
              </Button>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="mb-1 flex w-full items-center gap-1 px-2 text-xs font-medium text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
      >
        <ChevronDown
          className={cn(
            'h-3 w-3 transition-transform duration-200',
            !open && '-rotate-90'
          )}
          aria-hidden="true"
        />
        {group}
      </button>
      <div
        className={cn(
          'flex flex-col gap-1 overflow-hidden transition-all duration-200',
          open ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'
        )}
      >
        {items.map((item) => {
          const isActive =
            item.href === '/'
              ? pathname === '/' || pathname === '/dashboard'
              : pathname === item.href ||
                pathname.startsWith(item.href + '/')
          return (
            <Button
              key={item.href}
              variant={isActive ? 'secondary' : 'ghost'}
              size="default"
              className="justify-start relative px-3"
              asChild
            >
              <Link href={item.href}>
                <item.icon className="h-4 w-4 mr-3" aria-hidden="true" />
                {item.label}
              </Link>
            </Button>
          )
        })}
      </div>
    </div>
  )
}
