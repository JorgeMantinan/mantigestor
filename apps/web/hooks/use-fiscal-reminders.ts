'use client'

import { useCallback, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getCalendarioFiscal, type FechaFiscal } from '@mantigestor/utils'

const STORAGE_KEY = 'fiscal-notifs-creadas'

interface PreferenciaNotif {
  canal: string
  categoria: string
  diasAntelacion: number
  activo: boolean
}

function mapCategoria(modelo: string): string {
  if (modelo.includes('303') || modelo.includes('390') || modelo.includes('309') || modelo.includes('369')) return 'iva'
  if (modelo.includes('130') || modelo.includes('131') || modelo.includes('100') || modelo.includes('151')) return 'irpf'
  if (modelo.includes('111') || modelo.includes('190') || modelo.includes('115') || modelo.includes('180') || modelo.includes('123')) return 'retenciones'
  if (modelo.includes('RENTA') || modelo.includes('720') || modelo.includes('721') || modelo.includes('PATRIMONIO')) return 'renta'
  return 'todos'
}

function cumplePreferencia(
  fecha: FechaFiscal,
  diffDias: number,
  preferencias: PreferenciaNotif[],
): boolean {
  const cat = mapCategoria(fecha.modelo)
  const pref = preferencias.find(p => p.categoria === cat && p.canal === 'in_app')
    ?? preferencias.find(p => p.categoria === 'todos' && p.canal === 'in_app')
  if (!pref) return true // sin preferencia = notificar por defecto
  if (!pref.activo) return false
  return diffDias <= pref.diasAntelacion
}

/**
 * Comprueba si hay vencimientos fiscales próximos y crea notificaciones
 * en la tabla `notificaciones` para que aparezcan en el dropdown del header.
 * Se ejecuta una vez por sesión (guarda en localStorage las ya creadas).
 * Respeta las preferencias de notificación del usuario.
 */
export function useFiscalReminders() {
  const ejecutado = useRef(false)

  const crearRecordatorios = useCallback(async () => {
    if (ejecutado.current) return
    ejecutado.current = true

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Cargar preferencias del usuario
      let preferencias: PreferenciaNotif[] = []
      try {
        const { data: prefsData } = await supabase
          .from('preferencias_notificaciones')
          .select('canal, categoria, diasAntelacion, activo')
          .eq('perfilId', user.id)
        preferencias = (prefsData ?? []) as PreferenciaNotif[]
      } catch { /* sin preferencias = defaults */ }

      const year = new Date().getFullYear()
      const calendario = getCalendarioFiscal(year)
      const hoy = new Date()

      // Obtener IDs de notificaciones ya creadas esta sesión
      let creadas: string[] = []
      try {
        const raw = localStorage.getItem(STORAGE_KEY)
        if (raw) creadas = JSON.parse(raw) as string[]
      } catch { /* ignore */ }

      // Obtener notificaciones existentes del usuario
      const { data: existentes } = await supabase
        .from('notificaciones')
        .select('contenido')
        .eq('perfilId', user.id)
        .eq('tipo', 'fiscal')
        .gte('creadoEn', new Date(year, 0, 1).toISOString())

      const contenidoExistente = new Set(
        (existentes ?? []).map(n => n.contenido)
      )

      const nuevas: Array<{ tipo: string; contenido: string; perfilId: string }> = []

      for (const fecha of calendario) {
        const diffDias = Math.ceil(
          (fecha.fechaLimite.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24)
        )

        // Solo notificar si vence en los próximos días y no está pasado
        if (diffDias < 0 || diffDias > 30) continue

        // Respetar preferencias del usuario
        if (!cumplePreferencia(fecha, diffDias, preferencias)) continue

        const clave = `${fecha.modelo}-${fecha.fechaLimite.toISOString().slice(0, 10)}`
        if (creadas.includes(clave)) continue

        const contenido = diffDias === 0
          ? `HOY vence: ${fecha.descripcion}`
          : diffDias <= 3
            ? `En ${diffDias} días vence: ${fecha.descripcion}`
            : diffDias <= 7
              ? `Próximo vencimiento (${diffDias} días): ${fecha.descripcion}`
              : `Recordatorio: ${fecha.descripcion} vence el ${fecha.fechaLimite.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}`

        // Skip if already exists in DB
        if (contenidoExistente.has(contenido)) continue

        nuevas.push({
          tipo: 'fiscal',
          contenido,
          perfilId: user.id,
        })
        creadas.push(clave)
      }

      if (nuevas.length > 0) {
        await supabase.from('notificaciones').insert(
          nuevas.map(n => ({
            id: crypto.randomUUID(),
            ...n,
          }))
        )

        // Guardar en localStorage
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(creadas))
        } catch { /* ignore */ }
      }
    } catch {
      // silently fail — notificaciones son best-effort
    }
  }, [])

  useEffect(() => {
    void crearRecordatorios()
  }, [crearRecordatorios])
}
