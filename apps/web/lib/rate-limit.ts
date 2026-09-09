import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

export interface RateLimitConfig {
  maxRequests: number
  windowMs: number
}

interface RateLimitEntry {
  count: number
  resetAt: number
}

const store = new Map<string, RateLimitEntry>()

if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now()
    for (const [key, entry] of store.entries()) {
      if (now - entry.resetAt > 0) {
        store.delete(key)
      }
    }
  }, 5 * 60 * 1000)
}

const limiterCache = new Map<string, Ratelimit>()

function getUpstashLimiter(config: RateLimitConfig): Ratelimit | null {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN

  if (!url || !token) return null

  const cacheKey = `${config.maxRequests}:${config.windowMs}`
  const cached = limiterCache.get(cacheKey)
  if (cached) return cached

  try {
    const redis = new Redis({ url, token })
    const windowSec = Math.max(1, Math.round(config.windowMs / 1000))
    const limiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(config.maxRequests, `${windowSec}s`),
      analytics: false,
      prefix: `mantigestor:rl:${cacheKey}`,
    })
    limiterCache.set(cacheKey, limiter)
    return limiter
  } catch {
    console.warn('[rate-limit] Failed to init Upstash Redis, falling back to in-memory')
    return null
  }
}

export async function rateLimit(
  key: string,
  config: RateLimitConfig
): Promise<{ success: boolean; remaining: number }> {
  const limiter = getUpstashLimiter(config)

  if (limiter) {
    try {
      const result = await limiter.limit(key)
      return {
        success: result.success,
        remaining: result.remaining,
      }
    } catch (err) {
      console.error('[rate-limit] Upstash error, falling back to in-memory:', err)
    }
  }

  const now = Date.now()
  const entry = store.get(key)

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + config.windowMs })
    return { success: true, remaining: config.maxRequests - 1 }
  }

  if (entry.count >= config.maxRequests) {
    return { success: false, remaining: 0 }
  }

  entry.count++
  return { success: true, remaining: config.maxRequests - entry.count }
}
