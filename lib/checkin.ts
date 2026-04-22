import { kv } from '@/lib/kv'
import type { CheckinRecord, StreakState, ArticleProgress, DailyStats } from '@/types'

export function getTodayKey(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function dateIsConsecutive(prev: string, next: string): boolean {
  const p = new Date(prev)
  const n = new Date(next)
  const diff = (n.getTime() - p.getTime()) / (1000 * 60 * 60 * 24)
  return diff === 1
}

export async function getCheckinRecord(date: string): Promise<CheckinRecord> {
  const record = await kv.get<CheckinRecord>(`checkin:${date}`)
  return record ?? { checked: false, study_seconds: 0, articles_read: [] }
}

export async function markDailyCheckin(date: string): Promise<void> {
  const record = await getCheckinRecord(date)
  await kv.set(`checkin:${date}`, { ...record, checked: true })
  await updateStreak(date)
}

export async function addStudySeconds(date: string, seconds: number): Promise<void> {
  const record = await getCheckinRecord(date)
  await kv.set(`checkin:${date}`, {
    ...record,
    study_seconds: record.study_seconds + seconds,
  })
}

export async function markArticleRead(date: string, slug: string): Promise<void> {
  const record = await getCheckinRecord(date)
  if (record.articles_read.includes(slug)) return
  await kv.set(`checkin:${date}`, {
    ...record,
    articles_read: [...record.articles_read, slug],
  })
  await kv.set(`article:${slug}`, {
    completed: true,
    progress: 100,
    date,
  } satisfies ArticleProgress)
}

export async function getArticleProgress(slug: string): Promise<ArticleProgress | null> {
  return kv.get<ArticleProgress>(`article:${slug}`)
}

export async function getStreak(date: string): Promise<StreakState> {
  const current = await kv.get<StreakState>('streak:current')
  if (!current) return { count: 1, last_date: date, longest: 1 }

  if (current.last_date === date) return current

  const count = dateIsConsecutive(current.last_date, date) ? current.count + 1 : 1
  return {
    count,
    last_date: date,
    longest: Math.max(current.longest, count),
  }
}

async function updateStreak(date: string): Promise<void> {
  const streak = await getStreak(date)
  await kv.set('streak:current', streak)
}

export async function getDailyStats(date: string, totalArticles: number): Promise<DailyStats> {
  const [streak, checkin] = await Promise.all([
    getStreak(date),
    getCheckinRecord(date),
  ])
  return {
    streak,
    checkin,
    total_articles: totalArticles,
    completed_articles: checkin.articles_read.length,
  }
}
