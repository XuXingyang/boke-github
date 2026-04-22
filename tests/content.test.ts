import { describe, it, expect } from 'vitest'
import { getArticle, getAllArticles, getArticleSlugs } from '@/lib/content'

describe('content utilities', () => {
  it('getAllArticles returns array of ArticleMeta', async () => {
    const articles = await getAllArticles()
    expect(Array.isArray(articles)).toBe(true)
    if (articles.length > 0) {
      expect(articles[0]).toHaveProperty('slug')
      expect(articles[0]).toHaveProperty('title')
      expect(articles[0]).toHaveProperty('date')
    }
  })

  it('getArticle returns content for valid slug', async () => {
    const article = await getArticle('typescript-advanced-types')
    expect(article).not.toBeNull()
    expect(article?.title).toBe('TypeScript 类型体操进阶')
    expect(article?.content).toContain('类型系统')
  })

  it('getArticle returns null for invalid slug', async () => {
    const article = await getArticle('nonexistent-slug')
    expect(article).toBeNull()
  })

  it('articles are sorted by date descending', async () => {
    const articles = await getAllArticles()
    for (let i = 1; i < articles.length; i++) {
      expect(articles[i - 1].date >= articles[i].date).toBe(true)
    }
  })
})
