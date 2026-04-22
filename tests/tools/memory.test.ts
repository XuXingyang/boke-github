import { describe, it, expect, vi, beforeEach } from 'vitest'

// Module-level store — vi.mock factory closes over this reference
const store = new Map<string, unknown>()

vi.mock('@/lib/kv', () => ({
  kv: {
    get: vi.fn((k: string) => Promise.resolve(store.get(k) ?? null)),
    set: vi.fn((k: string, v: unknown) => { store.set(k, v); return Promise.resolve('OK' as any) }),
  },
}))

vi.mock('@/lib/models', () => ({
  getModel: vi.fn(() => ({})),
}))

vi.mock('ai', () => ({
  generateText: vi.fn().mockResolvedValue({ text: '-1,0' }),
}))

import { checkMemory, updateMemory, rebuildIndex } from '@/lib/tools/memory'
import { generateText } from 'ai'
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

beforeEach(() => {
  store.clear()        // mutate the same Map the closure holds
  vi.clearAllMocks()   // only clears call counts, not implementations
})

describe('memory tools', () => {
  it('updateMemory stores article in index', async () => {
    const { kv } = await import('@/lib/kv')
    await updateMemory(sampleArticle)
    expect(kv.set).toHaveBeenCalledWith(
      'memory:index',
      expect.arrayContaining([expect.objectContaining({ slug: 'react-19' })])
    )
  })

  it('updateMemory is idempotent for the same slug', async () => {
    const { kv } = await import('@/lib/kv')
    await updateMemory(sampleArticle)
    await updateMemory({ ...sampleArticle, summary: 'updated summary' })
    const lastCall = vi.mocked(kv.set).mock.calls.at(-1)!
    const index = lastCall[1] as any[]
    expect(index.filter((i: any) => i.slug === 'react-19').length).toBe(1)
    expect(index[0].summary).toBe('updated summary')
  })

  it('checkMemory returns null when index is empty', async () => {
    const result = await checkMemory('React hooks')
    expect(result).toBeNull()
  })

  it('checkMemory hits on keyword match', async () => {
    await updateMemory(sampleArticle)
    const result = await checkMemory('Actions')
    expect(result).not.toBeNull()
    expect(result?.slug).toBe('react-19')
  })

  it('checkMemory hits on title match', async () => {
    await updateMemory(sampleArticle)
    const result = await checkMemory('react 19')
    expect(result).not.toBeNull()
    expect(result?.found).toBe(true)
  })

  it('checkMemory hits via semantic similarity when score > 0.85', async () => {
    await updateMemory(sampleArticle)
    vi.mocked(generateText).mockResolvedValueOnce({ text: '0,0.92' } as any)
    const result = await checkMemory('concurrent rendering improvements')
    expect(result).not.toBeNull()
    expect(result?.slug).toBe('react-19')
  })

  it('checkMemory returns null when semantic score is low', async () => {
    await updateMemory(sampleArticle)
    vi.mocked(generateText).mockResolvedValueOnce({ text: '0,0.50' } as any)
    const result = await checkMemory('completely unrelated query')
    expect(result).toBeNull()
  })

  it('rebuildIndex writes full index to KV', async () => {
    const { kv } = await import('@/lib/kv')
    await rebuildIndex([sampleArticle])
    expect(kv.set).toHaveBeenCalledWith(
      'memory:index',
      expect.arrayContaining([expect.objectContaining({ slug: 'react-19' })])
    )
  })
})
