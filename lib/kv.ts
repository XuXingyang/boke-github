import Redis from 'ioredis'

let _client: Redis | null = null

function getClient(): Redis | null {
  const url = process.env.KV_REST_API_REDIS_URL
  if (!url) return null
  if (!_client) {
    _client = new Redis(url, {
      maxRetriesPerRequest: 1,
      connectTimeout: 5000,
      lazyConnect: false,
    })
    _client.on('error', () => {
      // suppress unhandled error events
    })
  }
  return _client
}

export const kv = {
  async get<T>(key: string): Promise<T | null> {
    try {
      const client = getClient()
      if (!client) return null
      const raw = await client.get(key)
      if (raw === null) return null
      try { return JSON.parse(raw) as T }
      catch { return raw as unknown as T }
    } catch {
      return null
    }
  },
  async set(key: string, value: unknown): Promise<string> {
    try {
      const client = getClient()
      if (!client) return 'OK'
      await client.set(key, JSON.stringify(value))
    } catch {
      // silently fail if Redis unavailable
    }
    return 'OK'
  },
}
