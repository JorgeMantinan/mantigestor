import { stripe } from './server'

export async function createCheckoutSession(userId: string, email: string, priceId: string) {
  const session = await stripe.checkout.sessions.create({
    customer_email: email,
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    payment_method_types: ['card', 'paypal', 'sepa_debit'],
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/ajustes?success=true&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/precios`,
    metadata: { userId },
    subscription_data: {
      metadata: { userId },
    },
  })
  return session
}

export async function createPortalSession(stripeCustomerId: string) {
  return stripe.billingPortal.sessions.create({
    customer: stripeCustomerId,
    return_url: `${process.env.NEXT_PUBLIC_APP_URL}/ajustes`,
  })
}
