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

export async function sendPushNotification(
  subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
  title: string,
  body: string,
  url?: string
): Promise<boolean> {
  if (!vapidPublicKey || !vapidPrivateKey) return false
  try {
    await webPush.sendNotification(
      subscription,
      JSON.stringify({ title, body, url })
    )
    return true
  } catch (e) {
    console.error('Push notification failed:', e)
    return false
  }
}
