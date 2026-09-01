import webPush from 'web-push'

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ''
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY ?? ''
const VAPID_EMAIL = process.env.VAPID_EMAIL ?? 'mailto:noreply@mantigestor.vercel.app'

let vapidConfigured = false

function ensureVapid() {
  if (vapidConfigured) return
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) return
  webPush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)
  vapidConfigured = true
}

export interface PushSubscriptionJSON {
  endpoint: string
  keys: { p256dh: string; auth: string }
}

export async function enviarPushVencimiento(
  subscription: PushSubscriptionJSON,
  titulo: string,
  cuerpo: string,
  url: string
): Promise<boolean> {
  ensureVapid()
  if (!vapidConfigured) return false

  try {
    await webPush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: { p256dh: subscription.keys.p256dh, auth: subscription.keys.auth },
      },
      JSON.stringify({
        title: titulo,
        body: cuerpo,
        icon: '/icon-192x192.png',
        badge: '/icon-192x192.png',
        data: { url },
        tag: 'factura-vencimiento',
        renotify: true,
      })
    )
    return true
  } catch (err: unknown) {
    const statusCode = (err as { statusCode?: number }).statusCode
    if (statusCode === 404 || statusCode === 410) {
      console.error('Suscripción push expirada o inválida:', subscription.endpoint)
    } else {
      console.error('Error enviando push notification:', err)
    }
    return false
  }
}

export interface FacturaVencimiento {
  id: string
  perfilId: string
  numero: string
  emisorReceptor: string
  total: number
  fechaVencimiento: string
  diffDias: number
}

export async function notificarVencimientosProximos(
  facturas: FacturaVencimiento[],
  supabase: ReturnType<typeof import('@/lib/supabase/admin').createAdminClient>
): Promise<{ pushEnviados: number; pushFallidos: number }> {
  const hoy = new Date()
  const dentroDe7 = new Date(hoy)
  dentroDe7.setDate(dentroDe7.getDate() + 7)

  const vencimientos = facturas
    .map(f => ({
      ...f,
      diffDias: Math.ceil(
        (new Date(f.fechaVencimiento).getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24)
      ),
    }))
    .filter(f => f.diffDias >= 0 && f.diffDias <= 7)

  if (vencimientos.length === 0) {
    return { pushEnviados: 0, pushFallidos: 0 }
  }

  const porPerfil = new Map<string, FacturaVencimiento[]>()
  for (const f of vencimientos) {
    const arr = porPerfil.get(f.perfilId) ?? []
    arr.push(f)
    porPerfil.set(f.perfilId, arr)
  }

  let pushEnviados = 0
  let pushFallidos = 0

  for (const [perfilId, facturasPerfil] of porPerfil) {
    try {
      const { data: perfil } = await supabase
        .from('perfiles')
        .select('userId')
        .eq('id', perfilId)
        .single()

      if (!perfil?.userId) continue

      const { data: suscripciones } = await supabase
        .from('push_subscriptions')
        .select('endpoint, p256dh, auth')
        .eq('userId', perfil.userId)

      if (!suscripciones || suscripciones.length === 0) continue

      for (const f of facturasPerfil) {
        const totalFmt = new Intl.NumberFormat('es-ES', {
          style: 'currency',
          currency: 'EUR',
        }).format(f.total / 100)
        const cuando =
          f.diffDias === 0
            ? 'hoy'
            : f.diffDias === 1
              ? 'mañana'
              : `en ${f.diffDias} días`
        const titulo = `Factura ${f.numero} vence ${cuando}`
        const cuerpo = `${f.emisorReceptor} — ${totalFmt}`

        for (const sub of suscripciones) {
          const ok = await enviarPushVencimiento(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            titulo,
            cuerpo,
            '/gestoria/facturas'
          )
          if (ok) pushEnviados++
          else pushFallidos++
        }
      }
    } catch (err) {
      console.error('Error enviando push a perfil:', perfilId, err)
      pushFallidos++
    }
  }

  return { pushEnviados, pushFallidos }
}
