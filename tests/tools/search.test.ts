import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@tavily/core', () => ({
  tavily: vi.fn(() => ({
    search: vi.fn().mockResolvedValue({
      results: [
        { title: 'React 19 release', content: 'React 19 introduces Actions...', url: 'https://react.dev' },
      ],
    }),
  })),
}))

vi.mock('fs', () => ({
  default: {
    writeFileSync: vi.fn(),
    mkdirSync: vi.fn(),
    existsSync: vi.fn(() => true),
  },
}))

import { searchWeb, saveArticle } from '@/lib/tools/search'

beforeEach(() => vi.clearAllMocks())

describe('search tools', () => {
  it('searchWeb returns results array', async () => {
    const results = await searchWeb('React 19')
    expect(Array.isArray(results)).toBe(true)
    expect(results[0]).toHaveProperty('title')
    expect(results[0]).toHaveProperty('content')
    expect(results[0]).toHaveProperty('url')
  })

  it('saveArticle returns a slug string and writes file', async () => {
    const fs = (await import('fs')).default
    const slug = await saveArticle({
      title: 'React 19 新特性',
      content: '# React 19\n\nContent here.',
      tags: ['React'],
      keywords: ['Actions'],
      summary: 'React 19 new features',
    })
    expect(typeof slug).toBe('string')
    expect(slug.length).toBeGreaterThan(0)
    expect(vi.mocked(fs.writeFileSync)).toHaveBeenCalled()
  })

  it('saveArticle slug is ascii-safe for ASCII title', async () => {
    const slug = await saveArticle({
      title: 'TypeScript Advanced',
      content: 'content',
      tags: [],
      keywords: [],
      summary: 'ts',
    })
    expect(slug).toMatch(/^[a-z0-9-]+$/)
    expect(slug).toContain('typescript')
  })
})
