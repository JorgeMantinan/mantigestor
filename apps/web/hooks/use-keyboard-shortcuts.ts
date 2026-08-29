'use client'

import { useEffect } from 'react'

interface ShortcutHandlers {
  onSearch?: () => void
  onNew?: () => void
  onEscape?: () => void
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
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handlers.onSearch, handlers.onNew, handlers.onEscape])
}
