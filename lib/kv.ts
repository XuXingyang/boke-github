import { Redis } from '@upstash/redis'

let _client: Redis | null = null

function getClient(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_KV_REST_API_URL
  const token = process.env.UPSTASH_REDIS_REST_KV_REST_API_TOKEN
  if (!url || !token) return null
  if (!_client) {
    _client = new Redis({ url, token })
  }
  return _client
}

export const kv = {
  async get<T>(key: string): Promise<T | null> {
    try {
      const client = getClient()
      if (!client) return null
      return await client.get<T>(key)
    } catch {
      return null
    }
  },
  async set(key: string, value: unknown): Promise<string> {
    try {
      const client = getClient()
      if (!client) return 'OK'
      await client.set(key, value)
    } catch {
      // silently fail
    }
    return 'OK'
  },
}
