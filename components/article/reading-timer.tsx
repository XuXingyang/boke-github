'use client'

import { useEffect, useRef } from 'react'

interface ReadingTimerProps {
  slug: string
}

export function ReadingTimer({ slug }: ReadingTimerProps) {
  const startRef = useRef<number>(Date.now())
  const accumulatedRef = useRef<number>(0)
  const isActiveRef = useRef<boolean>(true)
  const FLUSH_INTERVAL = 30

  useEffect(() => {
    startRef.current = Date.now()
    isActiveRef.current = true

    function handleVisibilityChange() {
      if (document.hidden) {
        accumulatedRef.current += Math.floor((Date.now() - startRef.current) / 1000)
        isActiveRef.current = false
      } else {
        startRef.current = Date.now()
        isActiveRef.current = true
      }
    }

    async function flush() {
      let seconds = accumulatedRef.current
      if (isActiveRef.current) {
        seconds += Math.floor((Date.now() - startRef.current) / 1000)
        startRef.current = Date.now()
        accumulatedRef.current = 0
      }
      if (seconds < 5) return
      await fetch('/api/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'study', seconds }),
      }).catch(() => {})
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    const interval = setInterval(flush, FLUSH_INTERVAL * 1000)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      clearInterval(interval)
      flush()
    }
  }, [slug])

  return null
}
