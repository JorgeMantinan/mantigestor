import { NextResponse, type NextRequest } from 'next/server'
import { escapeHtml } from '@/lib/escape-html'
import { verificarCron } from '@/lib/cron-auth'
import { createAdminClient } from '@/lib/supabase/admin'

interface Perfil {
  id: string
  email: string | null
  nombre: string | null
}

function getTrimestre(fecha: Date): number {
  return Math.ceil((fecha.getMonth() + 1) / 3)
}

export async function GET(req: NextRequest) {
    if (!verificarCron(req)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

  const supabase = createAdminClient()
  const hoy = new Date()
  const anyoActual = hoy.getFullYear()
  const mesActual = hoy.getMonth() + 1
  const trimestreActual = getTrimestre(hoy)

  const { data: perfiles } = await supabase
    .from('perfiles')
    .select('id, email, nombre')

  if (!perfiles || perfiles.length === 0) {
    return NextResponse.json({ alerts: 0 })
  }

  let alertsSent = 0

  for (const perfil of perfiles as Perfil[]) {
    if (!perfil.email) continue

    const alertas: string[] = []

    try {
      // 1. Facturas pendientes de cobro
      const { count: pendientes } = await supabase
        .from('facturas')
        .select('*', { count: 'exact', head: true })
        .eq('perfilId', perfil.id)
        .eq('estado', 'pendiente')

      if (pendientes && pendientes > 5) {
        alertas.push(`Tienes ${pendientes} facturas pendientes de cobro. Revisa la cartera de clientes.`)
      }

      // 2. Facturas vencidas
      const hoyStr = `${anyoActual}-${String(mesActual).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`
      const { count: vencidas } = await supabase
        .from('facturas')
        .select('*', { count: 'exact', head: true })
        .eq('perfilId', perfil.id)
        .eq('estado', 'pendiente')
        .lt('fechaVencimiento', hoyStr)

      if (vencidas && vencidas > 0) {
        alertas.push(`Tienes ${vencidas} facturas con fecha de vencimiento pasada. Considera gestionar el cobro.`)
      }

      // 3. Comparativa IVA trimestral
      const trimestreAnterior = trimestreActual === 1 ? 4 : trimestreActual - 1
      const anyoAnterior = trimestreActual === 1 ? anyoActual - 1 : anyoActual

      const inicioMesActual = (trimestreActual - 1) * 3 + 1
      const finMesActual = inicioMesActual + 2
      const inicioMesAnterior = (trimestreAnterior - 1) * 3 + 1
      const finMesAnterior = inicioMesAnterior + 2

      const [resActual, resAnterior] = await Promise.all([
        supabase.from('facturas').select('baseImponible, iva, tipo')
          .eq('perfilId', perfil.id)
          .gte('fechaEmision', `${anyoActual}-${String(inicioMesActual).padStart(2, '0')}-01`)
          .lte('fechaEmision', `${anyoActual}-${String(finMesActual).padStart(2, '0')}-31`),
        supabase.from('facturas').select('baseImponible, iva, tipo')
          .eq('perfilId', perfil.id)
          .gte('fechaEmision', `${anyoAnterior}-${String(inicioMesAnterior).padStart(2, '0')}-01`)
          .lte('fechaEmision', `${anyoAnterior}-${String(finMesAnterior).padStart(2, '0')}-31`),
      ])

      if (resActual.data && resAnterior.data && resAnterior.data.length > 0) {
        const ivaNetoActual = resActual.data
          .filter(f => f.tipo === 'ingreso')
          .reduce((s, f) => s + Math.round(f.baseImponible * (f.iva / 100)), 0) -
          resActual.data
          .filter(f => f.tipo === 'gasto')
          .reduce((s, f) => s + Math.round(f.baseImponible * (f.iva / 100)), 0)

        const ivaNetoAnterior = resAnterior.data
          .filter(f => f.tipo === 'ingreso')
          .reduce((s, f) => s + Math.round(f.baseImponible * (f.iva / 100)), 0) -
          resAnterior.data
          .filter(f => f.tipo === 'gasto')
          .reduce((s, f) => s + Math.round(f.baseImponible * (f.iva / 100)), 0)

        if (ivaNetoAnterior > 0 && ivaNetoActual > ivaNetoAnterior * 1.3) {
          const pct = Math.round(((ivaNetoActual - ivaNetoAnterior) / ivaNetoAnterior) * 100)
          alertas.push(
            `Tu IVA a ingresar este trimestre ha subido un ${pct}% respecto al anterior. ` +
            `Revisa si hay gastos deducibles sin contabilizar.`
          )
        }
      }

      // 4._ratio gastos/ingresos alto
      const { data: mesActualFacturas } = await supabase
        .from('facturas')
        .select('baseImponible, tipo')
        .eq('perfilId', perfil.id)
        .gte('fechaEmision', `${anyoActual}-${String(mesActual).padStart(2, '0')}-01`)
        .lte('fechaEmision', `${anyoActual}-${String(mesActual).padStart(2, '0')}-31`)

      if (mesActualFacturas && mesActualFacturas.length > 3) {
        const ingresosMes = mesActualFacturas
          .filter(f => f.tipo === 'ingreso')
          .reduce((s, f) => s + f.baseImponible, 0)
        const gastosMes = mesActualFacturas
          .filter(f => f.tipo === 'gasto')
          .reduce((s, f) => s + f.baseImponible, 0)

        if (ingresosMes > 0 && gastosMes > ingresosMes * 0.8) {
          alertas.push(
            `Tus gastos del mes representan más del 80% de tus ingresos. ` +
            `Revisa la estructura de costes.`
          )
        }
      }

      // 5. Sin actividad este mes
      if (mesActualFacturas && mesActualFacturas.length === 0) {
        alertas.push(
          `No hay facturas registradas este mes. Si ya has facturado, ` +
          `recuerda subirlas para mantener tu contabilidad al día.`
        )
      }

      if (alertas.length > 0) {
        await sendAlertEmail(perfil.email, perfil.nombre, alertas, hoy)
        alertsSent++
      }
    } catch (e) {
      console.error(`Error procesando alertas para ${perfil.id}:`, e)
    }
  }

  return NextResponse.json({ alerts: alertsSent })
}

async function sendAlertEmail(
  email: string,
  nombre: string | null,
  alertas: string[],
  hoy: Date
) {
  if (!process.env.RESEND_API_KEY) return

  const { Resend } = await import('resend')
  const resend = new Resend(process.env.RESEND_API_KEY)

  const hoyTexto = hoy.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })
  const listaAlertas = alertas.map(a => `<li style="margin-bottom: 8px;">${escapeHtml(a)}</li>`).join('')

  const { error: sendError } = await resend.emails.send({
    from: process.env.EMAIL_FROM || 'MantiGestor <noreply@mantigestor.vercel.app>',
    to: email,
    subject: `MantiGestor — Alertas inteligentes (${hoyTexto})`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #1a1a1a;">Tienes alertas pendientes de revisar</h2>
        <p>Hola ${escapeHtml(nombre ?? '')},</p>
        <p>Hemos detectado algunas situaciones que merecen tu atención:</p>
        <div style="background: #fef3c7; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <ul style="margin: 0; padding-left: 18px; line-height: 1.7; color: #92400e;">
            ${listaAlertas}
          </ul>
        </div>
        <p>Usa el dashboard de MantiGestor para analizar tu situación fiscal y financiera:</p>
        <a href="https://mantigestor.vercel.app/dashboard" style="display: inline-block; background: #eab308; color: #000; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-weight: bold;">
          Ir al Dashboard
        </a>
        <p style="color: #666; font-size: 12px; margin-top: 24px;">
          Este es un email automático de MantiGestor. Las alertas se generan semanalmente.
        </p>
      </div>
    `,
  })
  if (sendError) console.error('[cron:alertas-inteligentes] error de Resend:', sendError)
}
