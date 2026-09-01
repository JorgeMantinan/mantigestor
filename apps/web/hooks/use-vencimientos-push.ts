'use client'

import { useEffect, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'

const VENCIMIENTO_KEY = 'push_vencimiento_last_check'

export function useVencimientosPush(userId: string | null) {
  const hasRun = useRef(false)

  useEffect(() => {
    if (!userId || hasRun.current) return

    const lastCheck = localStorage.getItem(VENCIMIENTO_KEY)
    const hoy = new Date().toDateString()
    if (lastCheck === hoy) return

    hasRun.current = true

    async function check() {
      if (!userId) return

      try {
        if (Notification.permission !== 'granted') return

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
        const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        if (!supabaseUrl || !supabaseKey) return

        const supabase = createClient(supabaseUrl, supabaseKey)

        const hoy = new Date()
        const en3Dias = new Date(hoy)
        en3Dias.setDate(en3Dias.getDate() + 3)

        const { data: facturas } = await supabase
          .from('facturas')
          .select('id, numero, emisorReceptor, total, fechaVencimiento')
          .eq('perfilId', userId)
          .eq('tipo', 'ingreso')
          .eq('estado', 'pendiente')
          .not('fechaVencimiento', 'is', null)
          .lte('fechaVencimiento', en3Dias.toISOString())
          .gte('fechaVencimiento', hoy.toISOString())

        if (!facturas || facturas.length === 0) return

        for (const f of facturas) {
          const diff = Math.ceil(
            (new Date(f.fechaVencimiento).getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24)
          )
          const cuando = diff === 0 ? 'hoy' : diff === 1 ? 'mañana' : `en ${diff} días`
          const totalFmt = new Intl.NumberFormat('es-ES', {
            style: 'currency',
            currency: 'EUR',
          }).format(f.total / 100)

          new Notification(`Factura ${f.numero} vence ${cuando}`, {
            body: `${f.emisorReceptor} — ${totalFmt}`,
            icon: '/icon-192x192.png',
            tag: `factura-${f.id}`,
          })
        }

        localStorage.setItem(VENCIMIENTO_KEY, hoy.toDateString())
      } catch {
        // silent — client-side notifications are best-effort
      }
    }

    check()
  }, [userId])
}
