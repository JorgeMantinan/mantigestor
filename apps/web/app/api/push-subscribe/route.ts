import { NextResponse, type NextRequest } from 'next/server'
import { getAuthenticatedUser, unauthorized, badRequest, serverError } from '@/lib/api-helpers'
import { rateLimitByIp } from '@/lib/rate-limit-ip'
import { createServerClient } from '@supabase/ssr'
import { z } from 'zod'

// Solo endpoints de proveedores push reales: el servidor hace POST a este
// endpoint, así que un URL arbitrario sería SSRF (p.ej. IP internas de Vercel)
function endpointPushPermitido(url: string): boolean {
  try {
    const u = new URL(url)
    if (u.protocol !== 'https:') return false
    return (
      u.hostname === 'fcm.googleapis.com' ||
      u.hostname === 'updates.push.services.mozilla.com' ||
      /\.web\.push\.apple\.com$/.test(u.hostname)
    )
  } catch {
    return false
  }
}

const PushSubscriptionSchema = z.object({
  subscription: z.object({
    endpoint: z.string().url().max(2048).refine(endpointPushPermitido, 'Endpoint push no permitido'),
    keys: z.object({
      p256dh: z.string().min(10).max(512),
      auth: z.string().min(10).max(256),
    }),
  }),
})

export async function POST(req: NextRequest) {
  try {
    const { success } = await rateLimitByIp(req, { maxRequests: 10, windowMs: 60 * 1000 })
    if (!success) {
      return NextResponse.json(
        { error: 'Demasiadas peticiones. Intenta de nuevo en un minuto.' },
        { status: 429 }
      )
    }

    const user = await getAuthenticatedUser(req)
    if (!user) return unauthorized()

    const body = await req.json().catch(() => null)
    const parsed = PushSubscriptionSchema.safeParse(body)
    if (!parsed.success) {
      return badRequest(new Error('Datos de suscripción inválidos'))
    }
    const { subscription } = parsed.data

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get: (name: string) => req.cookies.get(name)?.value,
          set: () => {},
          remove: () => {},
        },
      }
    )

    // Eliminar suscripción existente con el mismo endpoint (solo las del propio usuario)
    await supabase
      .from('push_subscriptions')
      .delete()
      .eq('endpoint', subscription.endpoint)
      .eq('userId', user.id)

    const { error } = await supabase
      .from('push_subscriptions')
      .insert({
        id: crypto.randomUUID(),
        userId: user.id,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        createdAt: new Date().toISOString(),
      })

    if (error) throw error

    return NextResponse.json({ ok: true }, { status: 201 })
  } catch (error) {
    return serverError(error)
  }
}
