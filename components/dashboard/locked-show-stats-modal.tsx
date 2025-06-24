"use client"

import type React from "react"

import type { PhishShow } from "@/types"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { usePickStats } from "@/hooks/use-pick-stats"
import { PickStatsChart } from "@/components/dashboard/pick-stats-chart"

interface LockedShowStatsModalProps {
  show: PhishShow
  poolId: string
  children: React.ReactNode // Trigger element
}

export function LockedShowStatsModal({ show, poolId, children }: LockedShowStatsModalProps) {
  const { stats, isLoading } = usePickStats(poolId, show.id)
  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Pre-Show Pick Stats: {show.venue}</DialogTitle>
          <DialogDescription>See what songs everyone picked before the show starts. Good luck!</DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-[400px] pr-3 -mr-3">
          {isLoading ? (
            <p className="text-muted-foreground text-center py-4">Loading...</p>
          ) : (
            <PickStatsChart stats={stats} />
          )}
        </ScrollArea>
        <DialogFooter>
          <DialogTrigger asChild>
            <Button variant="outline">Close</Button>
          </DialogTrigger>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
