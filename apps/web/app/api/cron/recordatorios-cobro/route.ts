import { NextResponse, type NextRequest } from 'next/server'
import { escapeHtml } from '@/lib/escape-html'
import { mapConcurrente } from '@/lib/concurrency'
import { verificarCron } from '@/lib/cron-auth'
import { createAdminClient } from '@/lib/supabase/admin'


export const maxDuration = 300
/**
 * Cron job: /api/cron/recordatorios-cobro
 *
 * Runs daily. Checks for overdue invoices (past due date, still pending).
 * Groups reminders by client (one email per client, not per invoice).
 * Sends reminder emails and creates in-app notifications.
 */

interface FacturaVencida {
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

  const { data: facturas } = await supabase
    .from('facturas')
    .select('id, perfilId, numero, emisorReceptor, total, fechaVencimiento')
    .eq('tipo', 'ingreso')
    .eq('estado', 'pendiente')
    .not('fechaVencimiento', 'is', null)

  if (!facturas || facturas.length === 0) {
    return NextResponse.json({ notified: 0, emails: 0 })
  }

  const vencidas = (facturas as Array<FacturaVencida & { fechaVencimiento: string }>)
    .map(f => ({
      ...f,
      diffDias: Math.ceil((new Date(f.fechaVencimiento).getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24)),
    }))
    .filter(f => f.diffDias < 0)
    .sort((a, b) => a.diffDias - b.diffDias)

  if (vencidas.length === 0) {
    return NextResponse.json({ notified: 0, emails: 0 })
  }

  // Group by perfil
  const porPerfil = new Map<string, FacturaVencida[]>()
  for (const f of vencidas) {
    const arr = porPerfil.get(f.perfilId) ?? []
    arr.push(f)
    porPerfil.set(f.perfilId, arr)
  }

  let notified = 0
  let emails = 0

  // Concurrencia acotada (antes:3 round-trips secuenciales por perfil)
  await mapConcurrente(Array.from(porPerfil), 5, async ([perfilId, facturasPerfil]) => {
    try {
      const { data: perfil } = await supabase
        .from('perfiles')
        .select('email, nombre')
        .eq('id', perfilId)
        .single()

      if (!perfil?.email) return

      // Check if we already notified about these invoices today
      const { data: yaNotificadas } = await supabase
        .from('notificaciones')
        .select('contenido')
        .eq('perfilId', perfilId)
        .eq('tipo', 'factura_cobro_vencido')

      const yaSet = new Set((yaNotificadas ?? []).map(n => n.contenido))
      const nuevas = facturasPerfil.filter(f => !yaSet.has(f.id))

      if (nuevas.length === 0) return

      // Create in-app notifications
      const notifInserts = nuevas.map(f => ({
        id: crypto.randomUUID(),
        perfilId,
        tipo: 'factura_cobro_vencido',
        contenido: f.id,
      }))
      await supabase.from('notificaciones').insert(notifInserts)
      notified += notifInserts.length

      // Send grouped email
      await enviarEmailRecordatorioCobro(perfil.email, perfil.nombre, nuevas, hoy)
      emails++
    } catch (e) {
      console.error('Error en recordatorio de cobro:', e)
    }
  })

  return NextResponse.json({ notified, emails })
}

function formatearFactura(f: FacturaVencida): string {
  const fecha = new Date(f.fechaVencimiento).toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })
  const total = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(f.total / 100)
  const diasAtraso = Math.abs(f.diffDias)
  const cuando = diasAtraso === 1 ? 'con 1 día de retraso' : `con ${diasAtraso} días de retraso`
  return `<li><strong>${escapeHtml(String(f.numero))}</strong> — ${escapeHtml(String(f.emisorReceptor))} (${total}) venció el ${fecha} (${cuando})</li>`
}

async function enviarEmailRecordatorioCobro(
  email: string,
  nombre: string | null,
  facturas: FacturaVencida[],
  _hoy: Date
) {
  if (!process.env.RESEND_API_KEY) return

  const { Resend } = await import('resend')
  const resend = new Resend(process.env.RESEND_API_KEY)

  const lista = facturas.map(formatearFactura).join('')
  const totalPendiente = facturas.reduce((s, f) => s + f.total, 0)
  const totalFmt = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(totalPendiente / 100)

  const { error: sendError } = await resend.emails.send({
    from: process.env.EMAIL_FROM || 'MantiGestor <noreply@mantigestor.vercel.app>',
    to: email,
    subject: `MantiGestor — Recordatorio de cobro: ${facturas.length} factura(s) vencida(s)`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #dc2626;">Facturas pendientes de cobro</h2>
        <p>Hola ${escapeHtml(nombre ?? '')},</p>
        <p>Las siguientes facturas emitidas han superado su fecha de vencimiento y siguen pendientes de cobro:</p>
        <div style="background: #fef2f2; border-left: 4px solid #dc2626; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <ul style="margin: 0; padding-left: 18px; line-height: 1.7;">${lista}</ul>
        </div>
        <p style="font-size: 16px;"><strong>Total pendiente de cobro: ${totalFmt}</strong></p>
        <p>Te recomendamos contactar con tus clientes para gestionar el cobro de estas facturas.</p>
        <a href="https://mantigestor.vercel.app/gestoria/facturas" style="display: inline-block; background: #dc2626; color: #fff; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-weight: bold;">
          Ver facturas pendientes
        </a>
        <p style="color: #666; font-size: 12px; margin-top: 24px;">
          Este es un email automático de MantiGestor.
        </p>
      </div>
    `,
  })
  if (sendError) console.error('[cron:recordatorios-cobro] error de Resend:', sendError)
}
