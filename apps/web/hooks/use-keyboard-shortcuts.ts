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
  // Desestructurado: el efecto depende de las funciones (no del objeto, que
  // se recrea en cada render del padre)
  const { onSearch, onNew, onEscape, onFilterEstado, onFilterTipo, onFocusSearch } = handlers

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable

      if (e.key === 'Escape' && onEscape) {
        onEscape()
        return
      }

      if (e.key === '/' && !isInput && onSearch) {
        e.preventDefault()
        onSearch()
        return
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 'k' && onSearch) {
        e.preventDefault()
        onSearch()
        return
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 'n' && !isInput && onNew) {
        e.preventDefault()
        onNew()
        return
      }

      if (!isInput) {
        if (e.key === 'f' && onFocusSearch) {
          e.preventDefault()
          onFocusSearch()
          return
        }
        if (e.key === 'e' && onFilterEstado) {
          e.preventDefault()
          onFilterEstado()
          return
        }
        if (e.key === 't' && onFilterTipo) {
          e.preventDefault()
          onFilterTipo()
          return
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onSearch, onNew, onEscape, onFilterEstado, onFilterTipo, onFocusSearch])
}
