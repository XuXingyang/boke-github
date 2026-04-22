import Redis from 'ioredis'

let _client: Redis | null = null

function getClient(): Redis {
  if (!_client) {
    const url = process.env.KV_REST_API_REDIS_URL
    if (!url) throw new Error('KV_REST_API_REDIS_URL is not set')
    _client = new Redis(url, { maxRetriesPerRequest: 3, lazyConnect: false })
  }
  return _client
}

export const kv = {
  async get<T>(key: string): Promise<T | null> {
    const raw = await getClient().get(key)
    if (raw === null) return null
    try { return JSON.parse(raw) as T }
    catch { return raw as unknown as T }
  },
  async set(key: string, value: unknown): Promise<string> {
    await getClient().set(key, JSON.stringify(value))
    return 'OK'
  },
}
