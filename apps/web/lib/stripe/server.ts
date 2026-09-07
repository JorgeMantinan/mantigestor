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
