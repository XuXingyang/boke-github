import { describe, it, expect } from 'vitest'
import type { ArticleMeta, CheckinRecord, StreakState, ArticleProgress } from '@/types'

describe('Type structure', () => {
  it('ArticleMeta has required fields', () => {
    const meta: ArticleMeta = {
      title: 'Test',
      slug: 'test',
      date: '2026-04-18',
      tags: ['React'],
      keywords: ['hook'],
      summary: 'A test article',
      source: 'manual',
      read_time: 5,
    }
    expect(meta.slug).toBe('test')
  })

  it('CheckinRecord tracks study data', () => {
    const record: CheckinRecord = {
      checked: true,
      study_seconds: 3600,
      articles_read: ['react-hooks'],
    }
    expect(record.study_seconds).toBe(3600)
  })
})
