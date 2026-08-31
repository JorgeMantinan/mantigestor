'use client'

import { useEffect } from 'react'

interface ShortcutHandlers {
  onSearch?: () => void
  onNew?: () => void
  onEscape?: () => void
  onFilterEstado?: () => void
  onFilterTipo?: () => void
  onFocusSearch?: () => void
}

export function useKeyboardShortcuts(handlers: ShortcutHandlers) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable

      if (e.key === 'Escape' && handlers.onEscape) {
        handlers.onEscape()
        return
      }

      if (e.key === '/' && !isInput && handlers.onSearch) {
        e.preventDefault()
        handlers.onSearch()
        return
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 'k' && handlers.onSearch) {
        e.preventDefault()
        handlers.onSearch()
        return
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 'n' && !isInput && handlers.onNew) {
        e.preventDefault()
        handlers.onNew()
        return
      }

      if (!isInput) {
        if (e.key === 'f' && handlers.onFocusSearch) {
          e.preventDefault()
          handlers.onFocusSearch()
          return
        }
        if (e.key === 'e' && handlers.onFilterEstado) {
          e.preventDefault()
          handlers.onFilterEstado()
          return
        }
        if (e.key === 't' && handlers.onFilterTipo) {
          e.preventDefault()
          handlers.onFilterTipo()
          return
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handlers.onSearch, handlers.onNew, handlers.onEscape, handlers.onFilterEstado, handlers.onFilterTipo, handlers.onFocusSearch])
}
