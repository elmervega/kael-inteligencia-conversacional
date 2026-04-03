import { NextRequest } from 'next/server'
import { handlers } from '@/lib/auth'
import { withRateLimit, rateLimitConfig, getClientIp } from '@/lib/rateLimit'
import { checkRateLimit } from '@/lib/rateLimit'

// Apply rate limiting to login endpoint
// POST requests to /api/auth/callback/credentials are login attempts
async function authHandler(req: NextRequest) {
  // Check if this is a login attempt (callback endpoint)
  if (req.method === 'POST' && req.nextUrl.pathname.includes('/callback/credentials')) {
    const clientIp = getClientIp(req)
    const { limited } = checkRateLimit(clientIp, rateLimitConfig.login.max, rateLimitConfig.login.window)

    if (limited) {
      return new Response(
        JSON.stringify({ error: 'Too many login attempts. Please try again later.' }),
        { status: 429, headers: { 'Content-Type': 'application/json' } }
      )
    }
  }

  // Delegate to NextAuth handlers
  return handlers[req.method as keyof typeof handlers](req)
}

export const GET = handlers.GET
export const POST = handlers.POST