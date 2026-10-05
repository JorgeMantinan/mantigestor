'use client'

import { useEffect, useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
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
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              'h-8 w-8 shrink-0 p-0 text-muted-foreground hover:text-foreground sm:h-9 sm:w-auto sm:px-3 sm:py-2',
              collapsed && 'h-10 w-10'
            )}
            onClick={handleOpen}
            aria-label="Búsqueda global"
          >
            <Search className="h-4 w-4" aria-hidden="true" />
            {!collapsed && (
              <span className="hidden flex-1 text-left text-sm sm:inline">Buscar...</span>
            )}
          </Button>
        </TooltipTrigger>
        {collapsed && <TooltipContent side="right">Búsqueda global</TooltipContent>}
      </Tooltip>
      <GlobalSearchDialog open={open} onOpenChange={setOpen} />
    </>
  )
}
