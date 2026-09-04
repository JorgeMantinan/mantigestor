'use client'

export async function crearCheckoutRecurring(
  facturaId: string,
  email: string,
  amount: number,
  descripcion: string
): Promise<string | null> {
  try {
    const res = await fetch('/api/stripe/checkout-recurring', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        facturaId,
        email,
        amount,
        descripcion,
        mode: 'subscription'
      })
    })
    const data = await res.json()
    return data.url ?? null
  } catch {
    return null
  }
}

export function stripeConfigurado(): boolean {
  if (typeof window === 'undefined') return false
  return true
}
