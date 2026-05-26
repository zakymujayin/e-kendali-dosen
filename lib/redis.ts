import Redis from "ioredis"

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379"

let redis: Redis | null = null

function getClient(): Redis {
  if (!redis) {
    redis = new Redis(REDIS_URL, { maxRetriesPerRequest: 3 })
    redis.on("error", (err) => {
      console.warn("Redis connection error (non-fatal):", err.message)
    })
  }
  return redis
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    const val = await getClient().get(key)
    return val ? (JSON.parse(val) as T) : null
  } catch {
    return null
  }
}

export async function cacheSet(key: string, value: unknown, ttlSeconds: number): Promise<void> {
  try {
    await getClient().set(key, JSON.stringify(value), "EX", ttlSeconds)
  } catch {
    // cache failure is non-fatal
  }
}

export async function cacheDel(pattern: string): Promise<void> {
  try {
    const keys = await getClient().keys(pattern)
    if (keys.length > 0) {
      await getClient().del(...keys)
    }
  } catch {
    // cache failure is non-fatal
  }
}

export function ttlUntilMidnight(): number {
  const now = new Date()
  const midnight = new Date(now)
  midnight.setHours(23, 59, 59, 999)
  return Math.ceil((midnight.getTime() - now.getTime()) / 1000)
}
