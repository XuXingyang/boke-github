'use client'

import { useState, useEffect } from 'react'
import type { StreakState } from '@/types'

export function StreakCard() {
  const [streak, setStreak] = useState<StreakState>({ count: 0, last_date: '', longest: 0 })
  const [loading, setLoading] = useState(false)
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    fetch('/api/checkin')
      .then((r) => { if (!r.ok) throw new Error(); return r.json() })
      .then((d) => {
        if (d.streak) setStreak(d.streak)
        if (d.record) setChecked(d.record.checked)
      })
      .catch(() => {})
  }, [])

  async function handleCheckin() {
    if (checked || loading) return
    setLoading(true)
    try {
      const res = await fetch('/api/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'checkin' }),
      })
      if (res.ok) {
        setChecked(true)
        setStreak((s) => {
          const newCount = s.count + 1
          return { ...s, count: newCount, longest: Math.max(s.longest, newCount) }
        })
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-bg-secondary border border-green-accent/20 rounded-xl p-4 flex justify-between items-center">
      <div>
        <div className="text-sm font-semibold text-text-primary mb-1">今日打卡</div>
        <div className="text-xs text-text-muted">
          {new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
      </div>
      <button
        onClick={handleCheckin}
        disabled={checked || loading}
        className={`px-5 py-2 rounded-lg text-sm font-semibold text-white transition-all ${
          checked
            ? 'bg-green-accent/20 text-green-accent border border-green-accent/30 cursor-default'
            : 'progress-bar hover:opacity-90'
        }`}
      >
        {checked ? '🔥 已打卡' : loading ? '打卡中...' : '打卡'}
      </button>
    </div>
  )
}
