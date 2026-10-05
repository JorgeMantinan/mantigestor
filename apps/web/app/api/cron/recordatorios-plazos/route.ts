import { NextResponse, type NextRequest } from 'next/server'
import { verificarCron } from '@/lib/cron-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCalendarioFiscal } from '@mantigestor/utils'

/**
 * Cron job: /api/cron/recordatorios-plazos
 *
 * Llamar una vez al día (via Vercel Cron o external cron).
 * Envía un email a cada usuario con vencimientos fiscales próximos (hoy o mañana)
 * y deja además una notificación in-app (tipo 'fiscal_email').
 * Respeta las preferencias de notificación del usuario.
 *
 * Seguridad: comprobar CRON_SECRET en headers.
 */

interface Perfil {
  id: string
  email: string | null
  nombre: string | null
}

interface VencimientoProximo {
  modelo: string
  descripcion: string
  fechaLimite: Date
  diffDias: number
  categoria?: string
}

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

function cumplePreferenciaEmail(
  diffDias: number,
  categoria: string,
  preferencias: PreferenciaNotif[],
): boolean {
  const pref = preferencias.find(p => p.categoria === categoria && p.canal === 'email')
    ?? preferencias.find(p => p.categoria === 'todos' && p.canal === 'email')
  if (!pref) return true // sin preferencia = enviar por defecto
  if (!pref.activo) return false
  return diffDias <= pref.diasAntelacion
}

export async function GET(req: NextRequest) {
    if (!verificarCron(req)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

  const supabase = createAdminClient()

  const hoy = new Date()
  const year = hoy.getFullYear()
  const calendario = [...getCalendarioFiscal(year), ...getCalendarioFiscal(year + 1)]

  const vencimientos = calendario
    .map(fecha => ({ ...fecha, fechaLimite: new Date(fecha.fechaLimite) }))
    .map(fecha => ({
      ...fecha,
      diffDias: Math.ceil((fecha.fechaLimite.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24)),
      categoria: mapCategoria(fecha.modelo),
    }))
    .filter(f => f.diffDias >= 0 && f.diffDias <= 1)
    .sort((a, b) => a.diffDias - b.diffDias) as unknown as VencimientoProximo[]

  if (vencimientos.length === 0) {
    return NextResponse.json({ notified: 0, emails: 0 })
  }

  // Perfil activo de cada usuario
  const { data: perfiles } = await supabase
    .from('perfiles')
    .select('id, email, nombre')

  if (!perfiles || perfiles.length === 0) {
    return NextResponse.json({ notified: 0, emails: 0 })
  }

  let notified = 0
  let emails = 0

  for (const perfil of perfiles as Perfil[]) {
    // Solo usuarios con email (los perfiles con userId 'pending:...' no tienen auth)
    if (!perfil.email) continue

    try {
      // Cargar preferencias del usuario
      let preferencias: PreferenciaNotif[] = []
      try {
        const { data: prefsData } = await supabase
          .from('preferencias_notificaciones')
          .select('canal, categoria, diasAntelacion, activo')
          .eq('perfilId', perfil.id)
        preferencias = (prefsData ?? []) as PreferenciaNotif[]
      } catch { /* sin preferencias = defaults */ }

      // Filtrar vencimientos según preferencias de email
      const vencimientosFiltrados = vencimientos.filter(v =>
        cumplePreferenciaEmail(v.diffDias, v.categoria ?? 'todos', preferencias)
      )

      if (vencimientosFiltrados.length === 0) continue

      const clavePorVencimiento: Array<{ clave: string; v: VencimientoProximo }> = []
      for (const v of vencimientosFiltrados) {
        const fecha = `${v.fechaLimite.getFullYear()}-${String(v.fechaLimite.getMonth() + 1).padStart(2, '0')}-${String(v.fechaLimite.getDate()).padStart(2, '0')}`
        clavePorVencimiento.push({ clave: `${v.modelo}-${fecha}`, v })
      }

      // Verificar cuáles ya se notificaron por email
      const { data: yaEnviados } = await supabase
        .from('notificaciones')
        .select('contenido')
        .eq('perfilId', perfil.id)
        .eq('tipo', 'fiscal_email')

      const yaSet = new Set((yaEnviados ?? []).map(n => n.contenido))

      const pendientes = clavePorVencimiento.filter(c => !yaSet.has(c.clave))

      if (pendientes.length === 0) continue

      // Crear notificación in-app por cada vencimiento pendiente
      const nuevas = pendientes.map(c => ({
        id: crypto.randomUUID(),
        perfilId: perfil.id,
        tipo: 'fiscal_email',
        contenido: c.clave,
      }))
      await supabase.from('notificaciones').insert(nuevas)
      notified += nuevas.length

      // Email único con todos los vencimientos pendientes
      await enviarEmailVencimientos(
        perfil.email,
        perfil.nombre,
        pendientes.map(c => c.v),
        hoy
      )
      emails++
    } catch (e) {
      console.error('Error en recordatorio de plazos:', e)
    }
  }

  return NextResponse.json({ notified, emails })
}

function formatearVencimiento(v: VencimientoProximo): string {
  const fecha = v.fechaLimite.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })
  const cuando = v.diffDias === 0 ? 'HOY' : 'MAÑANA'
  return `<li><strong>${cuando}</strong> — ${v.descripcion} (vence el ${fecha})</li>`
}

async function enviarEmailVencimientos(
  email: string,
  nombre: string | null,
  vencimientos: VencimientoProximo[],
  hoy: Date
) {
  // Sin RESEND_API_KEY el email se omite (best-effort, sin romper el cron)
  if (!process.env.RESEND_API_KEY) return

  const { Resend } = await import('resend')
  const resend = new Resend(process.env.RESEND_API_KEY)

  const hoyTexto = hoy.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })
  const lista = vencimientos.map(formatearVencimiento).join('')

  await resend.emails.send({
    from: process.env.EMAIL_FROM || 'MantiGestor <noreply@mantigestor.vercel.app>',
    to: email,
    subject: `MantiGestor — Vencimientos fiscales próximos (${hoyTexto})`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #1a1a1a;">Tienes vencimientos fiscales próximos</h2>
        <p>Hola ${nombre ?? ''},</p>
        <p>Según el calendario fiscal, en los próximos días vencen estas obligaciones:</p>
        <div style="background: #fef3c7; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <ul style="margin: 0; padding-left: 18px; line-height: 1.7;">${lista}</ul>
        </div>
        <p>Usa las calculadoras de MantiGestor para preparar tu declaración con antelación:</p>
        <a href="https://mantigestor.vercel.app/fiscal" style="display: inline-block; background: #eab308; color: #000; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-weight: bold;">
          Ir a la calculadora fiscal
        </a>
        <p style="color: #666; font-size: 12px; margin-top: 24px;">
          Este es un email automático de MantiGestor. Puedes desactivar los recordatorios en ajustes.
        </p>
      </div>
    `,
  })
}
