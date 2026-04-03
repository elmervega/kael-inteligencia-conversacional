import { NextRequest, NextResponse } from 'next/server'

/**
 * Simple in-memory rate limiter
 * Tracks requests by IP address
 * For production, consider Redis-based solution
 */

interface RateLimitEntry {
  count: number
  resetTime: number
}

const rateLimitStore = new Map<string, RateLimitEntry>()

/**
 * Clean up expired entries periodically
 */
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetTime < now) {
      rateLimitStore.delete(key)
    }
  }
}, 60000) // Clean up every minute

/**
 * Rate limiting configuration
 */
export const rateLimitConfig = {
  // Default: 10 requests per 15 minutes
  defaultWindow: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  defaultMax: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '10'),

  // Specific endpoints
  register: {
    window: 3600000, // 1 hour
    max: 5 // 5 registrations per hour per IP
  },
  login: {
    window: 900000, // 15 minutes
    max: 10 // 10 login attempts per 15 minutes
  },
  api: {
    window: 900000, // 15 minutes
    max: 30 // 30 API calls per 15 minutes
  }
}

/**
 * Get client IP address from request
 */
export function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }

  const realIp = request.headers.get('x-real-ip')
  if (realIp) {
    return realIp.trim()
  }

  return request.ip || 'unknown'
}

/**
 * Check if request is rate limited
 * Returns { limited: boolean, remaining: number, resetTime: number }
 */
export function checkRateLimit(
  identifier: string,
  limit: number,
  windowMs: number
): { limited: boolean; remaining: number; resetTime: number } {
  const now = Date.now()
  const key = `rl:${identifier}`

  let entry = rateLimitStore.get(key)

  // Reset if window has expired
  if (!entry || entry.resetTime < now) {
    entry = {
      count: 0,
      resetTime: now + windowMs
    }
    rateLimitStore.set(key, entry)
  }

  entry.count++

  const remaining = Math.max(0, limit - entry.count)
  const limited = entry.count > limit

  return {
    limited,
    remaining,
    resetTime: entry.resetTime
  }
}

/**
 * Middleware for rate limiting
 * Usage: Wrap your API route handler
 *
 * Example:
 * ```
 * export const POST = withRateLimit(
 *   async (req) => { ... },
 *   rateLimitConfig.register
 * )
 * ```
 */
export function withRateLimit(
  handler: (req: NextRequest) => Promise<Response>,
  config: { window: number; max: number }
) {
  return async (req: NextRequest) => {
    const clientIp = getClientIp(req)
    const { limited, remaining, resetTime } = checkRateLimit(
      clientIp,
      config.max,
      config.window
    )

    // Add rate limit headers to response
    const headers = new Headers()
    headers.set('X-RateLimit-Limit', config.max.toString())
    headers.set('X-RateLimit-Remaining', remaining.toString())
    headers.set('X-RateLimit-Reset', Math.ceil(resetTime / 1000).toString())

    if (limited) {
      const retryAfter = Math.ceil((resetTime - Date.now()) / 1000)
      return new NextResponse(
        JSON.stringify({
          error: 'Too many requests. Please try again later.',
          retryAfter
        }),
        {
          status: 429, // Too Many Requests
          headers: {
            ...Object.fromEntries(headers.entries()),
            'Retry-After': retryAfter.toString()
          }
        }
      )
    }

    try {
      const response = await handler(req)
      // Add rate limit headers to successful response
      response.headers.set('X-RateLimit-Limit', config.max.toString())
      response.headers.set('X-RateLimit-Remaining', remaining.toString())
      response.headers.set('X-RateLimit-Reset', Math.ceil(resetTime / 1000).toString())
      return response
    } catch (error) {
      console.error('[RATE_LIMIT]', error)
      return new NextResponse(
        JSON.stringify({ error: 'Internal server error' }),
        {
          status: 500,
          headers: Object.fromEntries(headers.entries())
        }
      )
    }
  }
}

/**
 * User-based rate limiting (for authenticated endpoints)
 * Limits requests per user ID instead of IP
 */
export function checkUserRateLimit(
  userId: string,
  limit: number,
  windowMs: number
): { limited: boolean; remaining: number; resetTime: number } {
  const identifier = `user:${userId}`
  return checkRateLimit(identifier, limit, windowMs)
}

/**
 * Combined rate limiting (IP + User)
 * More restrictive of the two limits
 */
export function checkCombinedRateLimit(
  clientIp: string,
  userId: string | null,
  ipLimit: number,
  ipWindow: number,
  userLimit: number,
  userWindow: number
): { limited: boolean; reason: string; remaining: number } {
  const ipResult = checkRateLimit(clientIp, ipLimit, ipWindow)

  if (ipResult.limited) {
    return {
      limited: true,
      reason: 'Too many requests from your IP address',
      remaining: ipResult.remaining
    }
  }

  if (userId) {
    const userResult = checkUserRateLimit(userId, userLimit, userWindow)
    if (userResult.limited) {
      return {
        limited: true,
        reason: 'Too many requests from your account',
        remaining: userResult.remaining
      }
    }
  }

  return {
    limited: false,
    reason: '',
    remaining: Math.min(ipResult.remaining, userId ? userLimit : ipLimit)
  }
}
