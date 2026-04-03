import { NextRequest, NextResponse } from 'next/server'

interface RateLimitEntry {
  count: number
  resetTime: number
}

const rateLimitStore = new Map<string, RateLimitEntry>()

// Clean expired entries every minute
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetTime < now) rateLimitStore.delete(key)
  }
}, 60000)

export const rateLimitConfig = {
  defaultWindow: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'),
  defaultMax: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '10'),
  register: { window: 3600000, max: 5 },
  login: { window: 900000, max: 10 },
  api: { window: 900000, max: 30 }
}

export function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  const realIp = request.headers.get('x-real-ip')
  if (realIp) return realIp.trim()
  return request.ip || 'unknown'
}

export function checkRateLimit(
  identifier: string,
  limit: number,
  windowMs: number
): { limited: boolean; remaining: number; resetTime: number } {
  const now = Date.now()
  const key = `rl:${identifier}`
  let entry = rateLimitStore.get(key)

  if (!entry || entry.resetTime < now) {
    entry = { count: 0, resetTime: now + windowMs }
    rateLimitStore.set(key, entry)
  }

  entry.count++
  return {
    limited: entry.count > limit,
    remaining: Math.max(0, limit - entry.count),
    resetTime: entry.resetTime
  }
}

export function withRateLimit(
  handler: (req: NextRequest) => Promise<Response>,
  config: { window: number; max: number }
) {
  return async (req: NextRequest) => {
    const clientIp = getClientIp(req)
    const { limited, remaining, resetTime } = checkRateLimit(clientIp, config.max, config.window)

    const rlHeaders = {
      'X-RateLimit-Limit': config.max.toString(),
      'X-RateLimit-Remaining': remaining.toString(),
      'X-RateLimit-Reset': Math.ceil(resetTime / 1000).toString()
    }

    if (limited) {
      const retryAfter = Math.ceil((resetTime - Date.now()) / 1000)
      return new NextResponse(
        JSON.stringify({ error: 'Too many requests. Please try again later.', retryAfter }),
        { status: 429, headers: { ...rlHeaders, 'Retry-After': retryAfter.toString() } }
      )
    }

    try {
      const response = await handler(req)
      Object.entries(rlHeaders).forEach(([k, v]) => response.headers.set(k, v))
      return response
    } catch (error) {
      console.error('[RATE_LIMIT]', error)
      return new NextResponse(
        JSON.stringify({ error: 'Internal server error' }),
        { status: 500, headers: rlHeaders }
      )
    }
  }
}
