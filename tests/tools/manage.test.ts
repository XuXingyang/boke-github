import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/content', () => ({
  getAllArticles: vi.fn().mockResolvedValue([
    {
      title: 'React 19',
      slug: 'react-19',
      date: '2026-04-18',
      tags: ['React'],
      keywords: ['Actions'],
      summary: 'React 19 summary',
      source: 'agent_search',
      read_time: 10,
    },
  ]),
  getArticle: vi.fn().mockResolvedValue({
    title: 'React 19',
    slug: 'react-19',
    content: '# React 19\n\nContent',
    tags: [],
    keywords: [],
    summary: '',
    source: 'agent_search',
    read_time: 10,
    date: '2026-04-18',
  }),
}))

import { listArticles, searchContent, readArticle } from '@/lib/tools/manage'

beforeEach(() => vi.clearAllMocks())

describe('manage tools', () => {
  it('listArticles returns all articles', async () => {
    const articles = await listArticles()
    expect(articles.length).toBe(1)
    expect(articles[0].slug).toBe('react-19')
  })

  it('listArticles filters by tag', async () => {
    const results = await listArticles({ tag: 'React' })
    expect(results.length).toBe(1)
    const noResults = await listArticles({ tag: 'Python' })
    expect(noResults.length).toBe(0)
  })

  it('searchContent filters by query', async () => {
    const results = await searchContent('React')
    expect(results.length).toBeGreaterThan(0)
  })

  it('searchContent returns empty for no match', async () => {
    const results = await searchContent('Golang')
    expect(results.length).toBe(0)
  })

  it('readArticle returns content for valid slug', async () => {
    const content = await readArticle('react-19')
    expect(content).toContain('React 19')
  })
})
