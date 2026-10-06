import Stripe from 'stripe'

let _instance: Stripe | null = null

function getStripeInstance(): Stripe {
  if (!_instance) {
    const key = process.env.STRIPE_SECRET_KEY
    if (!key) {
      throw new Error('STRIPE_SECRET_KEY is not configured. Set it in .env.local to enable Stripe.')
    }
    _instance = new Stripe(key, {
      apiVersion: '2024-06-20',
      typescript: true,
    })
  }
  return _instance
}

export const stripe = new Proxy({} as Stripe, {
  get(_, prop, receiver) {
    return Reflect.get(getStripeInstance(), prop, receiver)
  }
})

export const PRO_PRICE_ID = process.env.STRIPE_PRO_PRICE_ID ?? ''

type SuscripcionConItems = {
  items?: { data?: Array<{ price?: { id?: string | null } | null } | null> | null } | null
}

/**
 * ¿La suscripción corresponde al plan PRO? Sin esta comprobación, CUALQUIER
 * suscripción de Stripe (p.ej. un cobro recurrente de unos céntimos, que usa
 * el mismo metadata.userId) se materializaba como tier:'PRO' en la BD.
 * Si falta STRIPE_PRO_PRICE_ID, falla cerrado (nunca concede PRO).
 */
export function esPlanPro(subscription: SuscripcionConItems): boolean {
  if (!PRO_PRICE_ID) return false
  return subscription.items?.data?.some((item) => item?.price?.id === PRO_PRICE_ID) ?? false
}
