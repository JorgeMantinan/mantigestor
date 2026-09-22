'use client'

import { usePersonaActiva } from '@/contexts/persona-activa-context'
import { useLanguage } from '@/contexts/language-context'
import { PersonaSelector } from './persona-selector'
import { Users } from 'lucide-react'

export function GestionandoBanner() {
  const { esPropio, personas, perfilActivoId } = usePersonaActiva()
  const { t } = useLanguage()

  if (esPropio) return null

  const persona = personas.find(p => p.perfilId === perfilActivoId)
  if (!persona) return null

  return (
    <div className="flex items-center justify-between gap-3 border-b bg-yellow-500/10 px-6 py-2 text-sm dark:bg-yellow-500/5">
      <div className="flex items-center gap-2">
        <Users className="h-4 w-4 text-yellow-600 dark:text-yellow-400" aria-hidden="true" />
        <span className="font-medium text-yellow-800 dark:text-yellow-200">
          {t('gestionandoBanner.gestionando')}:{' '}
          {persona.nombre || persona.email}
        </span>
        {persona.rol && (
          <span className="rounded-full bg-yellow-500/20 px-2 py-0.5 text-xs font-medium text-yellow-700 dark:text-yellow-300">
            {persona.rol === 'gestor' ? t('gestionandoBanner.gestor') : t('gestionandoBanner.visualizador')}
          </span>
        )}
      </div>
      <div className="flex items-center gap-2">
        <span className="hidden text-xs text-muted-foreground sm:inline">
          {t('gestionandoBanner.cambiarPersona')}
        </span>
        <PersonaSelector />
      </div>
    </div>
  )
}
