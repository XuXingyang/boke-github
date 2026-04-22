import { describe, it, expect, vi, beforeEach } from 'vitest'
import { kv } from '@/lib/kv'

vi.mock('@/lib/kv', () => {
  return {
    kv: {
      get: vi.fn(),
      set: vi.fn(),
      getdel: vi.fn(),
    },
  }
})

import {
  getTodayKey,
  getCheckinRecord,
  markDailyCheckin,
  addStudySeconds,
  markArticleRead,
  getStreak,
  getDailyStats,
  getArticleProgress,
} from '@/lib/checkin'

let store: Map<string, unknown>

beforeEach(() => {
  store = new Map()
  vi.mocked(kv.get).mockImplementation((key: string) =>
    Promise.resolve((store.get(key) as any) ?? null)
  )
  vi.mocked(kv.set).mockImplementation((key: string, val: unknown) => {
    store.set(key, val)
    return Promise.resolve('OK' as any)
  })
})

describe('checkin utilities', () => {
  it('getTodayKey returns YYYY-MM-DD format', () => {
    const key = getTodayKey()
    expect(key).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('markDailyCheckin sets checked=true', async () => {
    await markDailyCheckin('2026-04-18')
    expect(kv.set).toHaveBeenCalledWith(
      'checkin:2026-04-18',
      expect.objectContaining({ checked: true })
    )
  })

  it('addStudySeconds accumulates time', async () => {
    store.set('checkin:2026-04-18', { checked: true, study_seconds: 1800, articles_read: [] })
    await addStudySeconds('2026-04-18', 600)
    expect(kv.set).toHaveBeenCalledWith(
      'checkin:2026-04-18',
      expect.objectContaining({ study_seconds: 2400 })
    )
  })

  it('markArticleRead adds slug to articles_read', async () => {
    store.set('checkin:2026-04-18', { checked: true, study_seconds: 0, articles_read: [] })
    await markArticleRead('2026-04-18', 'react-hooks')
    expect(kv.set).toHaveBeenCalledWith(
      'checkin:2026-04-18',
      expect.objectContaining({ articles_read: ['react-hooks'] })
    )
  })

  it('streak increments on consecutive days', async () => {
    store.set('streak:current', { count: 5, last_date: '2026-04-17', longest: 10 })
    const streak = await getStreak('2026-04-18')
    expect(streak.count).toBe(6)
  })

  it('streak resets on non-consecutive day', async () => {
    store.set('streak:current', { count: 5, last_date: '2026-04-15', longest: 10 })
    const streak = await getStreak('2026-04-18')
    expect(streak.count).toBe(1)
  })

  it('getArticleProgress returns null for unknown slug', async () => {
    const progress = await getArticleProgress('unknown-slug')
    expect(progress).toBeNull()
  })

  it('getArticleProgress returns progress after markArticleRead', async () => {
    store.set('checkin:2026-04-18', { checked: true, study_seconds: 0, articles_read: [] })
    await markArticleRead('2026-04-18', 'react-19')
    const progress = await getArticleProgress('react-19')
    expect(progress).not.toBeNull()
    expect(progress?.completed).toBe(true)
    expect(progress?.progress).toBe(100)
  })
})
