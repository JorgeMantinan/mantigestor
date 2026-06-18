'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

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

  const fetchNotificaciones = useCallback(async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setCargando(false)
      return
    }

    const { data: perfil } = await supabase
      .from('perfiles')
      .select('id')
      .eq('userId', user.id)
      .single()

    if (!perfil) {
      setCargando(false)
      return
    }

    const { data } = await supabase
      .from('notificaciones')
      .select('*')
      .eq('perfilId', perfil.id)
      .order('creadoEn', { ascending: false })

    if (data) {
      setNotificaciones(data)
      setNoLeidas(data.filter((n) => !n.leido).length)
    }
    setCargando(false)
  }, [])

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

    const { data: perfil } = await supabase
      .from('perfiles')
      .select('id')
      .eq('userId', user.id)
      .single()

    if (!perfil) return

    await supabase
      .from('notificaciones')
      .update({ leido: true })
      .eq('perfilId', perfil.id)
      .eq('leido', false)

    setNotificaciones((prev) => prev.map((n) => ({ ...n, leido: true })))
    setNoLeidas(0)
  }, [])

  return { notificaciones, noLeidas, cargando, markAsRead, markAllAsRead }
}
