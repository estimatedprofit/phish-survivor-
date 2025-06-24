"use client"

import { useEffect, useState } from "react"
import { differenceInSeconds, formatDuration, intervalToDuration } from "date-fns"

export function TimeRemaining({ deadline }: { deadline: Date }) {
  const [now, setNow] = useState<Date>(() => new Date())

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(id)
  }, [])

  if (!deadline) return null

  if (deadline.getTime() - now.getTime() <= 0) {
    return <span className="text-destructive">Picks Locked</span>
  }

  const seconds = differenceInSeconds(deadline, now)
  const dur = intervalToDuration({ start: 0, end: seconds * 1000 })
  const readable = formatDuration(dur, { format: ["days", "hours", "minutes"] })

  return <span>{readable} remaining</span>
} 