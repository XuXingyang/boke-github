import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@vercel/kv', () => {
  const store = new Map<string, unknown>()
  return {
    kv: {
      get: vi.fn((key: string) => Promise.resolve(store.get(key) ?? null)),
      set: vi.fn((key: string, val: unknown) => { store.set(key, val); return Promise.resolve() }),
      getdel: vi.fn((key: string) => { const v = store.get(key); store.delete(key); return Promise.resolve(v ?? null) }),
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
} from '@/lib/checkin'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('checkin utilities', () => {
  it('getTodayKey returns YYYY-MM-DD format', () => {
    const key = getTodayKey()
    expect(key).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('markDailyCheckin sets checked=true', async () => {
    await markDailyCheckin('2026-04-18')
    const { kv } = await import('@vercel/kv')
    expect(kv.set).toHaveBeenCalledWith(
      'checkin:2026-04-18',
      expect.objectContaining({ checked: true })
    )
  })

  it('addStudySeconds accumulates time', async () => {
    const { kv } = await import('@vercel/kv')
    vi.mocked(kv.get).mockResolvedValueOnce({ checked: true, study_seconds: 1800, articles_read: [] })
    await addStudySeconds('2026-04-18', 600)
    expect(kv.set).toHaveBeenCalledWith(
      'checkin:2026-04-18',
      expect.objectContaining({ study_seconds: 2400 })
    )
  })

  it('markArticleRead adds slug to articles_read', async () => {
    const { kv } = await import('@vercel/kv')
    vi.mocked(kv.get).mockResolvedValueOnce({ checked: true, study_seconds: 0, articles_read: [] })
    await markArticleRead('2026-04-18', 'react-hooks')
    expect(kv.set).toHaveBeenCalledWith(
      'checkin:2026-04-18',
      expect.objectContaining({ articles_read: ['react-hooks'] })
    )
  })

  it('streak increments on consecutive days', async () => {
    const { kv } = await import('@vercel/kv')
    vi.mocked(kv.get).mockResolvedValueOnce({ count: 5, last_date: '2026-04-17', longest: 10 })
    const streak = await getStreak('2026-04-18')
    expect(streak.count).toBe(6)
  })

  it('streak resets on non-consecutive day', async () => {
    const { kv } = await import('@vercel/kv')
    vi.mocked(kv.get).mockResolvedValueOnce({ count: 5, last_date: '2026-04-15', longest: 10 })
    const streak = await getStreak('2026-04-18')
    expect(streak.count).toBe(1)
  })
})
