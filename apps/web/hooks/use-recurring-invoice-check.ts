'use client'

import { useCallback, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

const STORAGE_KEY = 'recurrentes-check-v1'

/**
 * Comprueba al abrir la app si hay facturas recurrentes pendientes de generar.
 * Si las hay, las genera y envía email de recordatorio.
 * Solo ejecuta una vez por día (guarda en localStorage).
 */
export function useRecurringInvoiceCheck() {
  const ejecutado = useRef(false)

  const comprobarYGenerar = useCallback(async () => {
    if (ejecutado.current) return
    ejecutado.current = true

    try {
      // Evitar ejecutar más de una vez por día
      const hoy = new Date().toISOString().slice(0, 10)
      const ultimaEjecucion = localStorage.getItem(STORAGE_KEY)
      if (ultimaEjecucion === hoy) return

      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const diaActual = new Date().getDate()

      // Buscar plantillas activas cuyo día coincide con hoy
      const { data: plantillas } = await supabase
        .from('facturas_recurrentes')
        .select('*')
        .eq('perfilId', user.id)
        .eq('activa', true)
        .eq('diaGeneracion', diaActual)

      if (!plantillas || plantillas.length === 0) return

      const hoyDate = new Date()
      const mesActual = hoyDate.getMonth() + 1
      const anyoActual = hoyDate.getFullYear()

      let generadas = 0
      const contrapartes: string[] = []

      for (const tpl of plantillas) {
        // Verificar que no se ya generó este mes
        if (tpl.ultimaGeneracion) {
          const ultima = new Date(tpl.ultimaGeneracion)
          if (ultima.getMonth() + 1 === mesActual && ultima.getFullYear() === anyoActual) {
            continue
          }
        }

        const importeIva = Math.round(tpl.baseImponible * (tpl.iva / 100))
        const total = tpl.baseImponible + importeIva
        const numero = `${tpl.numero}-${anyoActual}-${String(mesActual).padStart(2, '0')}`

        const { error } = await supabase.from('facturas').insert({
          id: crypto.randomUUID(),
          perfilId: tpl.perfilId,
          numero,
          tipo: tpl.tipo,
          emisorReceptor: tpl.emisorReceptor,
          nifContraparte: tpl.nifContraparte,
          fechaEmision: `${anyoActual}-${String(mesActual).padStart(2, '0')}-${String(tpl.diaGeneracion).padStart(2, '0')}`,
          baseImponible: tpl.baseImponible,
          iva: tpl.iva,
          total,
          estado: 'pendiente',
        })

        if (!error) {
          generadas++
          contrapartes.push(tpl.emisorReceptor)

          // Actualizar última generación
          await supabase
            .from('facturas_recurrentes')
            .update({ ultimaGeneracion: hoyDate.toISOString() })
            .eq('id', tpl.id)
        }
      }

      // Enviar email de recordatorio si se generaron facturas
      if (generadas > 0) {
        const { data: perfil } = await supabase
          .from('perfiles')
          .select('email, nombre')
          .eq('id', user.id)
          .single()

        if (perfil?.email) {
          try {
            await fetch('/api/facturas/recurrentes/enviar-email', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                email: perfil.email,
                nombre: perfil.nombre,
                contrapartes,
                mes: mesActual,
                anyo: anyoActual,
              }),
            })
          } catch {
            // Email es best-effort
          }
        }
      }

      // Marcar como ejecutado hoy
      localStorage.setItem(STORAGE_KEY, hoy)
    } catch {
      // Silently fail — facturas recurrentes son best-effort
    }
  }, [])

  useEffect(() => {
    void comprobarYGenerar()
  }, [comprobarYGenerar])
}
