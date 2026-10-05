import { NextResponse, type NextRequest } from 'next/server'
import { verificarCron } from '@/lib/cron-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { notificarVencimientosProximos } from '@/lib/enviar-push'

/**
 * Cron job: /api/cron/recordatorios-facturas
 *
 * Llamar una vez al día. Envía email de recordatorio por cada factura
 * emitida con fecha de vencimiento dentro de los próximos 7 días.
 * Crea también notificación in-app.
 */

interface _Perfil {
  id: string
  email: string | null
  nombre: string | null
}

interface FacturaVencimiento {
  id: string
  perfilId: string
  numero: string
  emisorReceptor: string
  total: number
  fechaVencimiento: string
  diffDias: number
}

export async function GET(req: NextRequest) {
    if (!verificarCron(req)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

  const supabase = createAdminClient()
  const hoy = new Date()
  const en7Dias = new Date(hoy)
  en7Dias.setDate(en7Dias.getDate() + 7)

  const { data: facturas } = await supabase
    .from('facturas')
    .select('id, perfilId, numero, emisorReceptor, total, fechaVencimiento')
    .eq('tipo', 'ingreso')
    .eq('estado', 'pendiente')
    .not('fechaVencimiento', 'is', null)

  if (!facturas || facturas.length === 0) {
    return NextResponse.json({ notified: 0, emails: 0 })
  }

  const pendientes = (facturas as Array<FacturaVencimiento & { fechaVencimiento: string }>)
    .map(f => ({
      ...f,
      diffDias: Math.ceil((new Date(f.fechaVencimiento).getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24)),
    }))
    .filter(f => f.diffDias >= 0 && f.diffDias <= 7)
    .sort((a, b) => a.diffDias - b.diffDias)

  if (pendientes.length === 0) {
    return NextResponse.json({ notified: 0, emails: 0 })
  }

  // Agrupar por perfilId
  const porPerfil = new Map<string, FacturaVencimiento[]>()
  for (const f of pendientes) {
    const arr = porPerfil.get(f.perfilId) ?? []
    arr.push(f)
    porPerfil.set(f.perfilId, arr)
  }

  let notified = 0
  let emails = 0

  for (const [perfilId, facturasPerfil] of porPerfil) {
    try {
      const { data: perfil } = await supabase
        .from('perfiles')
        .select('email, nombre')
        .eq('id', perfilId)
        .single()

      if (!perfil?.email) continue

      // Verificar si ya se notificó alguna de estas facturas hoy
      const { data: yaNotificadas } = await supabase
        .from('notificaciones')
        .select('contenido')
        .eq('perfilId', perfilId)
        .eq('tipo', 'factura_vencimiento')

      const yaSet = new Set((yaNotificadas ?? []).map(n => n.contenido))
      const nuevas = facturasPerfil.filter(f => !yaSet.has(f.id))

      if (nuevas.length === 0) continue

      // Crear notificaciones in-app
      const notifInserts = nuevas.map(f => ({
        id: crypto.randomUUID(),
        perfilId,
        tipo: 'factura_vencimiento',
        contenido: f.id,
      }))
      await supabase.from('notificaciones').insert(notifInserts)
      notified += notifInserts.length

      // Enviar email
      await enviarEmailFacturas(
        perfil.email,
        perfil.nombre,
        nuevas,
        hoy
      )
      emails++
    } catch (e) {
      console.error('Error en recordatorio de facturas:', e)
    }
  }

  // Enviar push notifications a todos los perfiles con suscripciones activas
  const pushResult = await notificarVencimientosProximos(pendientes, supabase)

  return NextResponse.json({ notified, emails, pushEnviados: pushResult.pushEnviados, pushFallidos: pushResult.pushFallidos })
}

function formatearFactura(f: FacturaVencimiento): string {
  const fecha = new Date(f.fechaVencimiento).toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })
  const total = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(f.total / 100)
  const cuando = f.diffDias === 0 ? 'HOY' : f.diffDias === 1 ? 'MAÑANA' : `en ${f.diffDias} días`
  return `<li><strong>${f.numero}</strong> — ${f.emisorReceptor} (${total}) vence ${cuando} (${fecha})</li>`
}

async function enviarEmailFacturas(
  email: string,
  nombre: string | null,
  facturas: FacturaVencimiento[],
  hoy: Date
) {
  if (!process.env.RESEND_API_KEY) return

  const { Resend } = await import('resend')
  const resend = new Resend(process.env.RESEND_API_KEY)

  const hoyTexto = hoy.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })
  const lista = facturas.map(formatearFactura).join('')
  const totalPendiente = facturas.reduce((s, f) => s + f.total, 0)
  const totalFmt = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(totalPendiente / 100)

  await resend.emails.send({
    from: process.env.EMAIL_FROM || 'MantiGestor <noreply@mantigestor.vercel.app>',
    to: email,
    subject: `MantiGestor — Facturas con cobro próximo (${hoyTexto})`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #1a1a1a;">Tienes facturas próximas a vencer</h2>
        <p>Hola ${nombre ?? ''},</p>
        <p>Estas facturas emitidas tienen fecha de cobro en los próximos días:</p>
        <div style="background: #fef3c7; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <ul style="margin: 0; padding-left: 18px; line-height: 1.7;">${lista}</ul>
        </div>
        <p style="font-size: 16px;"><strong>Total pendiente: ${totalFmt}</strong></p>
        <a href="https://mantigestor.vercel.app/gestoria/facturas" style="display: inline-block; background: #eab308; color: #000; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-weight: bold;">
          Ver facturas
        </a>
        <p style="color: #666; font-size: 12px; margin-top: 24px;">
          Este es un email automático de MantiGestor.
        </p>
      </div>
    `,
  })
}
