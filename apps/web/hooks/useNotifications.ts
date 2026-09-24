'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { usePersonaActiva } from '@/contexts/persona-activa-context'

interface Notificacion {
  id: string
  tipo: string
  leido: boolean
  contenido: string
  creadoEn: string
}

export function useNotifications() {
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([])
  const [noLeidas, setNoLeidas] = useState(0)
  const [cargando, setCargando] = useState(true)
  const { perfilActivoId } = usePersonaActiva()

  const fetchNotificaciones = useCallback(async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setCargando(false)
      return
    }

    let perfilId = perfilActivoId
    if (!perfilId) {
      const { data: perfil } = await supabase
        .from('perfiles')
        .select('id')
        .eq('userId', user.id)
        .single()
      perfilId = perfil?.id ?? null
    }

    if (!perfilId) {
      setCargando(false)
      return
    }

    const { data } = await supabase
      .from('notificaciones')
      .select('*')
      .eq('perfilId', perfilId)
      .order('creadoEn', { ascending: false })

    if (data) {
      setNotificaciones(data)
      setNoLeidas(data.filter((n) => !n.leido).length)
    }
    setCargando(false)
  }, [perfilActivoId])

  useEffect(() => {
    fetchNotificaciones()
  }, [fetchNotificaciones])

  const markAsRead = useCallback(async (id: string) => {
    const supabase = createClient()
    await supabase.from('notificaciones').update({ leido: true }).eq('id', id)
    setNotificaciones((prev) =>
      prev.map((n) => (n.id === id ? { ...n, leido: true } : n))
    )
    setNoLeidas((prev) => Math.max(0, prev - 1))
  }, [])

  const markAllAsRead = useCallback(async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    let perfilId = perfilActivoId
    if (!perfilId) {
      const { data: perfil } = await supabase
        .from('perfiles')
        .select('id')
        .eq('userId', user.id)
        .single()
      perfilId = perfil?.id ?? null
    }

    if (!perfilId) return

    await supabase
      .from('notificaciones')
      .update({ leido: true })
      .eq('perfilId', perfilId)
      .eq('leido', false)

    setNotificaciones((prev) => prev.map((n) => ({ ...n, leido: true })))
    setNoLeidas(0)
  }, [perfilActivoId])

  return { notificaciones, noLeidas, cargando, markAsRead, markAllAsRead }
}
