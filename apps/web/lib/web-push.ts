import webPush from 'web-push'

const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY

if (vapidPublicKey && vapidPrivateKey) {
  webPush.setVapidDetails(
    'mailto:admin@mantigestor.vercel.app',
    vapidPublicKey,
    vapidPrivateKey
  )
}

export type NotificationCategory = 'fiscal_deadline' | 'invoice_reminder' | 'payment_received' | 'general'

interface PushPayload {
  title: string
  body: string
  url?: string
  category?: NotificationCategory
  icon?: string
  badge?: string
  tag?: string
}

const CATEGORY_DEFAULTS: Record<NotificationCategory, { icon: string; badge: string; tag: string }> = {
  fiscal_deadline: {
    icon: '/icon.svg',
    badge: '/favicon.svg',
    tag: 'fiscal-deadline',
  },
  invoice_reminder: {
    icon: '/icon.svg',
    badge: '/favicon.svg',
    tag: 'invoice-reminder',
  },
  payment_received: {
    icon: '/icon.svg',
    badge: '/favicon.svg',
    tag: 'payment-received',
  },
  general: {
    icon: '/icon.svg',
    badge: '/favicon.svg',
    tag: 'general',
  },
}

export async function sendPushNotification(
  subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
  title: string,
  body: string,
  url?: string,
  category: NotificationCategory = 'general'
): Promise<boolean> {
  if (!vapidPublicKey || !vapidPrivateKey) return false
  try {
    const defaults = CATEGORY_DEFAULTS[category]
    const payload: PushPayload = {
      title,
      body,
      url: url || '/dashboard',
      category,
      icon: defaults.icon,
      badge: defaults.badge,
      tag: defaults.tag,
    }
    await webPush.sendNotification(
      subscription,
      JSON.stringify(payload)
    )
    return true
  } catch (e) {
    console.error('Push notification failed:', e)
    return false
  }
}

export async function sendFiscalDeadlineNotification(
  subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
  modelo: string,
  fechaLimite: string
): Promise<boolean> {
  return sendPushNotification(
    subscription,
    'Plazo fiscal próximo',
    `El modelo ${modelo} vence el ${fechaLimite}. No olvides presentarlo.`,
    `/fiscal?seccion=${modelo}`,
    'fiscal_deadline'
  )
}

export async function sendInvoiceReminder(
  subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
  numeroFactura: string,
  emisorReceptor: string,
  fechaVencimiento: string
): Promise<boolean> {
  return sendPushNotification(
    subscription,
    'Factura por cobrar',
    `La factura ${numeroFactura} de ${emisorReceptor} vence el ${fechaVencimiento}.`,
    '/gestoria/facturas',
    'invoice_reminder'
  )
}

export async function sendPaymentReceivedNotification(
  subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
  importe: string,
  emisorReceptor: string
): Promise<boolean> {
  return sendPushNotification(
    subscription,
    'Pago recibido',
    `Has recibido un pago de ${importe} de ${emisorReceptor}.`,
    '/gestoria/facturas',
    'payment_received'
  )
}
