import { NextResponse, type NextRequest } from 'next/server'
import { verificarCron } from '@/lib/cron-auth'
import { mapConcurrente } from '@/lib/concurrency'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCalendarioFiscal } from '@mantigestor/utils'
import { sendPushNotification } from '@/lib/web-push'


export const maxDuration = 300
/**
 * Cron job: /api/cron/push-notifications
 *
 * Llamar una vez al día (via Vercel Cron).
 * Envía push notifications a todos los usuarios suscritos con vencimientos
 * fiscales próximos (≤3 días).
 *
 * Seguridad: comprobar CRON_SECRET en headers.
 */

interface PushRow {
  userId: string
  endpoint: string
  p256dh: string
  auth: string
}

interface VencimientoProximo {
  modelo: string
  descripcion: string
  fechaLimite: Date
  diffDias: number
  categoria: string
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
    .map(f => ({ ...f, fechaLimite: new Date(f.fechaLimite) }))
    .map(f => ({
      ...f,
      diffDias: Math.ceil((f.fechaLimite.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24)),
    }))
    .filter(f => f.diffDias >= 0 && f.diffDias <= 3)
    .sort((a, b) => a.diffDias - b.diffDias) as unknown as VencimientoProximo[]

  if (vencimientos.length === 0) {
    return NextResponse.json({ sent: 0 })
  }

  const { data: subscriptions } = await supabase
    .from('push_subscriptions')
    .select('userId, endpoint, p256dh, auth')

  if (!subscriptions || subscriptions.length === 0) {
    return NextResponse.json({ sent: 0 })
  }

  const subs = subscriptions as PushRow[]
  const uniqueUserIds = [...new Set(subs.map(s => s.userId))]

  let sent = 0
  let failed = 0

  // Concurrencia entre usuarios: los envíos HTTP eran U×V×S secuenciales
  await mapConcurrente(uniqueUserIds, 5, async (userId) => {
    const userSubs = subs.filter(s => s.userId === userId)

    for (const v of vencimientos) {
      const cuando = v.diffDias === 0 ? 'HOY' : v.diffDias === 1 ? 'MAÑANA' : `en ${v.diffDias} días`
      const title = `MantiGestor — ${v.descripcion}`
      const body = `Vence ${cuando}. Prepárate con la calculadora fiscal.`
      const url = `/fiscal?seccion=${v.modelo.split('-')[0]}`

      for (const sub of userSubs) {
        const ok = await sendPushNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          title,
          body,
          url
        )
        if (ok) sent++
        else failed++
      }
    }
  })

  return NextResponse.json({ sent, failed })
}
