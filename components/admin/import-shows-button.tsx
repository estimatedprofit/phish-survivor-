"use client"

import { useState, useTransition } from "react"
import { importShowsForPool } from "@/lib/actions"
import { Button } from "@/components/ui/button"

export function ImportShowsButton({ poolId, year }: { poolId: string; year?: number }) {
  const [pending, startTransition] = useTransition()
  const [message, setMessage] = useState<string | null>(null)

  const handleClick = () => {
    startTransition(async () => {
      setMessage(null)
      const res = await importShowsForPool(poolId, year)
      setMessage(res.message)
    })
  }

  return (
    <div className="flex flex-col gap-2">
      <Button onClick={handleClick} disabled={pending} variant="outline">
        {pending ? "Importing…" : "Import Upcoming Shows"}
      </Button>
      {message && <p className="text-xs text-muted-foreground">{message}</p>}
    </div>
  )
} 