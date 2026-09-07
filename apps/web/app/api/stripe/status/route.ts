import { NextResponse, type NextRequest } from 'next/server'
import { rateLimitByIp } from '@/lib/rate-limit-ip'

export async function GET(req: NextRequest) {
  const { success } = rateLimitByIp(req)
  if (!success) {
    return NextResponse.json({ error: 'Demasiadas peticiones' }, { status: 429 })
  }

  const configured = !!(
    process.env.STRIPE_SECRET_KEY &&
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  )
  return NextResponse.json({ configured })
}
