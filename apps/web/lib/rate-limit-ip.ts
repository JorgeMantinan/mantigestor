import { rateLimit, type RateLimitConfig } from './rate-limit'

const DEFAULT_CONFIG: RateLimitConfig = {
  maxRequests: 30,
  windowMs: 60 * 1000,
}

export function rateLimitByIp(req: Request, config: RateLimitConfig = DEFAULT_CONFIG) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    ?? req.headers.get('x-real-ip')
    ?? 'unknown'

  return rateLimit(`ip:${ip}`, config)
}
