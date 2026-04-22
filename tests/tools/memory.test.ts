import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@vercel/kv', () => {
  const store = new Map<string, unknown>()
  return {
    kv: {
      get: vi.fn((k: string) => Promise.resolve(store.get(k) ?? null)),
      set: vi.fn((k: string, v: unknown) => { store.set(k, v); return Promise.resolve() }),
    },
  }
})

vi.mock('@/lib/models', () => ({
  getModel: vi.fn(() => ({})),
}))

vi.mock('ai', () => ({
  generateText: vi.fn().mockResolvedValue({ text: '0.3' }),
}))

import { checkMemory, updateMemory, rebuildIndex } from '@/lib/tools/memory'
import type { ArticleMeta } from '@/types'

const sampleArticle: ArticleMeta = {
  title: 'React 19 新特性',
  slug: 'react-19',
  date: '2026-04-18',
  tags: ['React'],
  keywords: ['并发', 'Actions'],
  summary: 'React 19 引入了 Actions 和并发渲染改进',
  source: 'agent_search',
  read_time: 10,
}

let store: Map<string, unknown>

beforeEach(() => {
  store = new Map()
  vi.clearAllMocks()
})

describe('memory tools', () => {
  it('updateMemory stores article in index', async () => {
    const { kv } = await import('@vercel/kv')
    vi.mocked(kv.get).mockImplementation((k: string) =>
      Promise.resolve((store.get(k) as any) ?? null)
    )
    vi.mocked(kv.set).mockImplementation((k: string, v: unknown) => {
      store.set(k, v)
      return Promise.resolve('OK' as any)
    })
    await updateMemory(sampleArticle)
    expect(kv.set).toHaveBeenCalledWith(
      'memory:index',
      expect.arrayContaining([
        expect.objectContaining({ slug: 'react-19' }),
      ])
    )
  })

  it('checkMemory returns null when index is empty', async () => {
    const { kv } = await import('@vercel/kv')
    vi.mocked(kv.get).mockResolvedValueOnce([])
    const result = await checkMemory('React hooks')
    expect(result).toBeNull()
  })

  it('rebuildIndex writes full index to KV', async () => {
    const { kv } = await import('@vercel/kv')
    await rebuildIndex([sampleArticle])
    expect(kv.set).toHaveBeenCalledWith(
      'memory:index',
      expect.arrayContaining([expect.objectContaining({ slug: 'react-19' })])
    )
  })
})
