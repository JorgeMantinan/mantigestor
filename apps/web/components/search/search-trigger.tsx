'use client'

import { useEffect, useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { GlobalSearchDialog } from './global-search-dialog'

export function SearchTrigger({ collapsed = false }: { collapsed?: boolean }) {
  const [open, setOpen] = useState(false)

  const handleOpen = useCallback(() => setOpen(true), [])

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setOpen(prev => !prev)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <>
      <Button
        variant="outline"
        className={cn(
          'h-8 w-8 shrink-0 p-0 text-muted-foreground hover:text-foreground sm:h-9 sm:w-auto sm:px-3 sm:py-2',
          collapsed && 'h-10 w-10 mx-auto'
        )}
        onClick={handleOpen}
        aria-label="Búsqueda global (Ctrl+K)"
      >
        <Search className="h-4 w-4" aria-hidden="true" />
        {!collapsed && (
          <>
            <span className="hidden flex-1 text-left text-sm sm:inline">Buscar...</span>
            <kbd className="pointer-events-none hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 lg:flex">
              <span className="text-xs">Ctrl</span>
              <span className="text-xs">K</span>
            </kbd>
          </>
        )}
      </Button>
      <GlobalSearchDialog open={open} onOpenChange={setOpen} />
    </>
  )
}
