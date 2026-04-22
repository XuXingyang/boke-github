import { NextRequest, NextResponse } from 'next/server'
import {
  getTodayKey,
  markDailyCheckin,
  addStudySeconds,
  markArticleRead,
  getCheckinRecord,
  getStreak,
} from '@/lib/checkin'
import { getAllArticles } from '@/lib/content'

export async function GET() {
  const today = getTodayKey()
  const [record, streak, articles] = await Promise.all([
    getCheckinRecord(today),
    getStreak(today),
    getAllArticles(),
  ])
  return NextResponse.json({ record, streak, total_articles: articles.length })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { action, slug, seconds } = body
  const today = getTodayKey()

  if (action === 'checkin') {
    await markDailyCheckin(today)
    return NextResponse.json({ ok: true })
  }

  if (action === 'study' && typeof seconds === 'number') {
    await addStudySeconds(today, seconds)
    return NextResponse.json({ ok: true })
  }

  if (action === 'article' && typeof slug === 'string') {
    await markArticleRead(today, slug)
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'invalid action' }, { status: 400 })
}
