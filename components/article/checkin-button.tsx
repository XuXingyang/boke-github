'use client'

import { useState } from 'react'

interface CheckinButtonProps {
  slug: string
  isCompleted: boolean
}

export function CheckinButton({ slug, isCompleted: initialCompleted }: CheckinButtonProps) {
  const [completed, setCompleted] = useState(initialCompleted)
  const [loading, setLoading] = useState(false)

  async function handleCheckin() {
    if (completed || loading) return
    setLoading(true)
    try {
      const res = await fetch('/api/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'article', slug }),
      })
      if (res.ok) setCompleted(true)
    } finally {
      setLoading(false)
    }
  }

  if (completed) {
    return (
      <div className="flex items-center gap-2 text-green-accent text-sm font-semibold">
        <span className="text-xl">✅</span>
        已标记为已学习
      </div>
    )
  }

  return (
    <button
      onClick={handleCheckin}
      disabled={loading}
      className="px-5 py-2.5 rounded-lg text-sm font-semibold text-white progress-bar disabled:opacity-50 transition-opacity hover:opacity-90"
    >
      {loading ? '记录中...' : '✅ 标记已学习'}
    </button>
  )
}
