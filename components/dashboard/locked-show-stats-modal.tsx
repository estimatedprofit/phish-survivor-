"use client"

import type React from "react"

import type { PhishShow, ShowResultsSummary } from "@/types"
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

interface LockedShowStatsModalProps {
  show: PhishShow
  children: React.ReactNode // Trigger element
}

const PreShowPickAnalysisChart = ({ summary }: { summary: ShowResultsSummary }) => {
  if (!summary || summary.songPickCounts.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-4">No pick data available for this show yet.</p>
  }

  const totalPicksForShow = summary.songPickCounts.reduce((sum, current) => sum + current.count, 0)
  const maxPicks = Math.max(...summary.songPickCounts.map((s) => s.count), 0)

  // Sort by count descending
  const sortedPicks = [...summary.songPickCounts].sort((a, b) => b.count - a.count)

  return (
    <div className="space-y-2 mt-2">
      {sortedPicks.map(({ song, count }) => {
        const percentage = totalPicksForShow > 0 ? ((count / totalPicksForShow) * 100).toFixed(0) : 0
        return (
          <div key={song.id} className="flex items-center gap-3 text-sm">
            <span className="flex-1 truncate font-medium" title={song.title}>
              {song.title}
            </span>
            <div className="w-32 h-5 bg-muted rounded overflow-hidden">
              <div
                className="bg-blue-500 h-full" // Using a neutral color like blue
                style={{ width: maxPicks > 0 ? `${(count / maxPicks) * 100}%` : "0%" }}
              >
                &nbsp;
              </div>
            </div>
            <span className="w-20 text-right text-xs font-mono text-muted-foreground">
              {count} ({percentage}%)
            </span>
          </div>
        )
      })}
    </div>
  )
}

export function LockedShowStatsModal({ show, children }: LockedShowStatsModalProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Pre-Show Pick Stats: {show.venue}</DialogTitle>
          <DialogDescription>See what songs everyone picked before the show starts. Good luck!</DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-[400px] pr-3 -mr-3">
          {" "}
          {/* Negative margin to hide scrollbar track if not needed */}
          {show.resultsSummary ? (
            <PreShowPickAnalysisChart summary={show.resultsSummary} />
          ) : (
            <p className="text-muted-foreground text-center py-4">Pick statistics are not yet available.</p>
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
