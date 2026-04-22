export const dynamic = 'force-dynamic'

import { StreakCard } from '@/components/checkin/streak-card'
import { StatsCard } from '@/components/checkin/stats-card'
import { HeatmapCalendar } from '@/components/checkin/heatmap-calendar'
import { getStreak, getCheckinRecord, getTodayKey } from '@/lib/checkin'
import { getAllArticles } from '@/lib/content'

export default async function CheckinPage() {
  const today = getTodayKey()
  const [streak, record, articles] = await Promise.all([
    getStreak(today),
    getCheckinRecord(today),
    getAllArticles(),
  ])

  const hours = (record.study_seconds / 3600).toFixed(1)

  return (
    <div className="max-w-2xl mx-auto px-6 py-8 flex flex-col gap-5">
      <StreakCard />

      <div className="flex gap-3">
        <StatsCard
          value={streak.count}
          label="当前连续天数 🔥"
          sub={`历史最长 ${streak.longest} 天`}
          color="text-yellow-accent"
        />
        <StatsCard
          value={`${hours}h`}
          label="本月学习时长"
          sub="今日累计"
          color="text-green-accent"
        />
        <StatsCard
          value={record.articles_read.length}
          label="已完成文章"
          sub={`共 ${articles.length} 篇`}
          color="text-purple"
        />
      </div>

      <HeatmapCalendar />
    </div>
  )
}
