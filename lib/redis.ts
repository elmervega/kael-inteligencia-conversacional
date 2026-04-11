import { Redis } from "redis";

let redis: Redis | null = null;

export function getRedis() {
  if (!redis) {
    redis = new Redis({
      host: process.env.REDIS_HOST || "localhost",
      port: parseInt(process.env.REDIS_PORT || "6379"),
      password: process.env.REDIS_PASSWORD,
    });

    redis.on("error", (err) => {
      console.error("Redis connection error:", err);
      redis = null; // Reset on error
    });

    redis.on("connect", () => {
      console.log("Redis connected");
    });
  }

  return redis;
}

export async function cacheGet(key: string): Promise<string | null> {
  try {
    const redis = getRedis();
    if (!redis) return null;
    return await redis.get(key);
  } catch (error) {
    console.warn(`Cache GET error for ${key}:`, error);
    return null;
  }
}

export async function cacheSet(
  key: string,
  value: string,
  expirySeconds = 3600
): Promise<void> {
  try {
    const redis = getRedis();
    if (!redis) return;
    await redis.setex(key, expirySeconds, value);
  } catch (error) {
    console.warn(`Cache SET error for ${key}:`, error);
  }
}

export async function cacheDel(key: string): Promise<void> {
  try {
    const redis = getRedis();
    if (!redis) return;
    await redis.del(key);
  } catch (error) {
    console.warn(`Cache DEL error for ${key}:`, error);
  }
}

export function getCacheKey(userId: string, message: string): string {
  const sanitized = message.toLowerCase().trim().substring(0, 100);
  return `kael:chat:${userId}:${Buffer.from(sanitized).toString("base64")}`;
}
