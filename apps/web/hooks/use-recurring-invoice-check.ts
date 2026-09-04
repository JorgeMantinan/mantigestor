'use client'

import { useCallback, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

const STORAGE_KEY_GEN = 'recurrentes-gen-v1'
const STORAGE_KEY_EMAIL = 'recurrentes-email-v1'

/**
 * Comprueba al abrir la app:
 * 1. Si hay facturas pendientes de generar (diaGeneracion = hoy)
 * 2. Si toca enviar email de recordatorio (diaEmail = hoy)
 * Cada cosa se ejecuta como máximo una vez por día.
 */
export function useRecurringInvoiceCheck() {
  const ejecutado = useRef(false)

  const comprobar = useCallback(async () => {
    if (ejecutado.current) return
    ejecutado.current = true

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const hoy = new Date()
      const diaActual = hoy.getDate()
      const mesActual = hoy.getMonth() + 1
      const anyoActual = hoy.getFullYear()
      const hoyStr = hoy.toISOString().slice(0, 10)

      // ── 1. GENERAR FACTURAS (diaGeneracion = hoy) ──
      const ultimaGen = localStorage.getItem(STORAGE_KEY_GEN)
      if (ultimaGen !== hoyStr) {
        const { data: plantillas } = await supabase
          .from('facturas_recurrentes')
          .select('*')
          .eq('perfilId', user.id)
          .eq('activa', true)
          .eq('diaGeneracion', diaActual)

        if (plantillas && plantillas.length > 0) {
          let generadas = 0
          for (const tpl of plantillas) {
            if (tpl.ultimaGeneracion) {
              const ultima = new Date(tpl.ultimaGeneracion)
              if (ultima.getMonth() + 1 === mesActual && ultima.getFullYear() === anyoActual) continue
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
              createdAt: new Date().toISOString(),
            })

            if (!error) {
              generadas++
              await supabase
                .from('facturas_recurrentes')
                .update({ ultimaGeneracion: hoy.toISOString() })
                .eq('id', tpl.id)
            }
          }
          localStorage.setItem(STORAGE_KEY_GEN, hoyStr)
        }
      }

      // ── 2. ENVIAR EMAIL (diaEmail = hoy) ──
      const ultimaEmail = localStorage.getItem(STORAGE_KEY_EMAIL)
      if (ultimaEmail !== hoyStr) {
        const { data: paraEmail } = await supabase
          .from('facturas_recurrentes')
          .select('emisorReceptor')
          .eq('perfilId', user.id)
          .eq('activa', true)
          .eq('diaEmail', diaActual)

        if (paraEmail && paraEmail.length > 0) {
          const contrapartes = paraEmail.map(p => p.emisorReceptor)
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
            } catch { /* email es best-effort */ }
          }
          localStorage.setItem(STORAGE_KEY_EMAIL, hoyStr)
        }
      }
    } catch {
      // Silently fail
    }
  }, [])

  useEffect(() => {
    void comprobar()
  }, [comprobar])
}
