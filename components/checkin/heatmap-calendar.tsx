'use client'

import { useEffect, useState } from 'react'

const LEVEL_STYLES = [
  'bg-bg-tertiary',
  'bg-green-accent/20',
  'bg-green-accent/50',
  'bg-green-accent/85',
]

export function HeatmapCalendar() {
  const [days, setDays] = useState<{ day: number; level: number }[]>([])

  useEffect(() => {
    const now = new Date()
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
    const result = Array.from({ length: daysInMonth }, (_, i) => ({
      day: i + 1,
      level: i < now.getDate() ? Math.floor(Math.random() * 4) : 0,
    }))
    setDays(result)
  }, [])

  return (
    <div className="bg-bg-secondary border border-border rounded-xl p-4">
      <div className="text-[10px] text-text-muted uppercase tracking-widest mb-3">本月打卡日历</div>
      <div className="flex flex-wrap gap-1">
        {days.map(({ day, level }) => (
          <div
            key={day}
            title={`${day}日`}
            className={`w-6 h-6 rounded flex items-center justify-center text-[9px] text-text-muted cursor-default ${LEVEL_STYLES[level]}`}
          >
            {day}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-1.5 mt-3 justify-end">
        <span className="text-[9px] text-text-muted">少</span>
        {LEVEL_STYLES.map((cls, i) => (
          <div key={i} className={`w-3 h-3 rounded-sm ${cls}`} />
        ))}
        <span className="text-[9px] text-text-muted">多</span>
      </div>
    </div>
  )
}
