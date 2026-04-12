import { getRedis } from './redis'

// Fallback en memoria cuando Redis no está disponible
const fallbackStore = new Map<string, { count: number; resetTime: number }>()

setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of fallbackStore.entries()) {
    if (entry.resetTime < now) fallbackStore.delete(key)
  }
}, 60_000)

/**
 * Lua script: INCR atómico + PEXPIRE solo en el primer request de la ventana.
 * Evita race conditions sin transacciones.
 */
const RL_SCRIPT = `
local current = redis.call('INCR', KEYS[1])
if current == 1 then
  redis.call('PEXPIRE', KEYS[1], ARGV[1])
end
local pttl = redis.call('PTTL', KEYS[1])
return {current, pttl}
`

/**
 * Verifica rate limit usando Redis con fallback en memoria.
 * @param key       Identificador único (e.g. "login:1.2.3.4", "chat:free:userId")
 * @param limit     Número máximo de requests permitidos
 * @param windowMs  Duración de la ventana en milisegundos
 */
export async function checkRateLimitRedis(
  key: string,
  limit: number,
  windowMs: number
): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
  const redisKey = `rl:${key}`
  try {
    const redis = getRedis()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (redis as any).eval(
      RL_SCRIPT, 1, redisKey, String(windowMs)
    ) as [number, number]

    const count = result[0]
    const pttl = result[1]
    const resetTime = pttl > 0 ? Date.now() + pttl : Date.now() + windowMs

    return {
      allowed: count <= limit,
      remaining: Math.max(0, limit - count),
      resetTime,
    }
  } catch (err) {
    console.warn('[RateLimit] Redis no disponible, usando fallback en memoria:', (err as Error).message)
    return checkFallback(redisKey, limit, windowMs)
  }
}

function checkFallback(
  key: string,
  limit: number,
  windowMs: number
): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now()
  const entry = fallbackStore.get(key)

  if (!entry || now > entry.resetTime) {
    fallbackStore.set(key, { count: 1, resetTime: now + windowMs })
    return { allowed: true, remaining: limit - 1, resetTime: now + windowMs }
  }

  entry.count++
  return {
    allowed: entry.count <= limit,
    remaining: Math.max(0, limit - entry.count),
    resetTime: entry.resetTime,
  }
}
