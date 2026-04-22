'use client'

import { useEffect, useState } from 'react'
import type { CheckinRecord, StreakState } from '@/types'

interface StatsBarProps {
  totalArticles: number
}

export function StatsBar({ totalArticles }: StatsBarProps) {
  const [streak, setStreak] = useState<StreakState>({ count: 0, last_date: '', longest: 0 })
  const [record, setRecord] = useState<CheckinRecord>({ checked: false, study_seconds: 0, articles_read: [] })

  useEffect(() => {
    fetch('/api/checkin')
      .then((r) => {
        if (!r.ok) throw new Error('Failed to fetch checkin data')
        return r.json()
      })
      .then((data) => {
        if (data.streak) setStreak(data.streak)
        if (data.record) setRecord(data.record)
      })
      .catch(() => {
        // Silently fail: keep default zero values
      })
  }, [])

  const hours = (record.study_seconds / 3600).toFixed(1)
  const completedCount = record.articles_read.length
  const monthProgress = totalArticles > 0 ? Math.min(100, Math.round((completedCount / totalArticles) * 100)) : 0

  return (
    <div className="bg-gradient-nav border-b border-border-purple px-6 py-2.5 flex gap-5 items-center text-xs">
      <StatItem icon="🔥" value={streak.count} label="连续天数" color="text-yellow-accent" />
      <div className="w-px h-5 bg-border-purple" />
      <StatItem icon="⏱" value={`${hours}h`} label="今日学习" color="text-green-accent" />
      <div className="w-px h-5 bg-border-purple" />
      <StatItem icon="✅" value={completedCount} label="已学文章" color="text-purple" />
      <div className="ml-auto flex items-center gap-2">
        <span className="text-text-muted">本月</span>
        <div className="w-20 h-1.5 bg-bg-tertiary rounded-full overflow-hidden">
          <div className="h-full progress-bar rounded-full transition-all" style={{ width: `${monthProgress}%` }} />
        </div>
        <span className="text-purple">{monthProgress}%</span>
      </div>
    </div>
  )
}

function StatItem({ icon, value, label, color }: { icon: string; value: string | number; label: string; color: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-base">{icon}</span>
      <div>
        <div className={`text-sm font-bold leading-none ${color}`}>{value}</div>
        <div className="text-text-muted text-[10px] mt-0.5">{label}</div>
      </div>
    </div>
  )
}
