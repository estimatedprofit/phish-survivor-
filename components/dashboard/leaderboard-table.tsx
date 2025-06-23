"use client"

import type { LeaderboardEntry } from "@/types"
import { useState, useEffect } from "react" // Changed from just useState
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Trophy, Eye, Skull } from "lucide-react"
import { PlayerPicksModal } from "./player-picks-modal"

interface LeaderboardTableProps {
  entries: LeaderboardEntry[]
  title?: string
}

const ITEMS_PER_PAGE = 10

export function LeaderboardTable({ entries: allEntries, title = "Leaderboard" }: LeaderboardTableProps) {
  const [visibleItems, setVisibleItems] = useState(ITEMS_PER_PAGE)

  useEffect(() => {
    setVisibleItems(ITEMS_PER_PAGE)
  }, [allEntries])

  if (!allEntries) {
    return <p className="text-muted-foreground">Loading leaderboard...</p>
  }

  if (allEntries.length === 0) {
    return (
      <Card className="card-gradient">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-4">No players match the current filter.</p>
        </CardContent>
      </Card>
    )
  }

  const currentEntries = allEntries.slice(0, visibleItems)

  const showMore = () => {
    setVisibleItems((prev) => Math.min(prev + ITEMS_PER_PAGE, allEntries.length))
  }

  const getPastPicksSummary = (picks: LeaderboardEntry["allPicks"]) => {
    if (picks.length === 0) return "-"
    const recentPicks = picks
      .sort((a, b) => new Date(b.showDate!).getTime() - new Date(a.showDate!).getTime())
      .slice(0, 2)
      .map((p) => p.songTitle)
      .join(", ")

    return picks.length > 2 ? `${recentPicks}... (${picks.length} total)` : recentPicks || "-"
  }

  return (
    <Card className="card-gradient">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-yellow-500" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="whitespace-nowrap">
              <TableRow>
                <TableHead className="w-12 text-xs sm:text-sm">#</TableHead>
                <TableHead className="text-xs sm:text-sm min-w-[120px]">Player</TableHead>
                <TableHead className="text-center text-xs sm:text-sm min-w-[80px]">Status</TableHead>
                <TableHead className="text-center text-xs sm:text-sm min-w-[70px]">Streak</TableHead>
                <TableHead className="text-center text-xs sm:text-sm min-w-[70px]">Correct</TableHead>
                <TableHead className="text-center text-xs sm:text-sm min-w-[60px]">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentEntries.map((entry, index) => (
                <TableRow key={entry.userId} className="whitespace-nowrap">
                  <TableCell className="font-medium text-xs sm:text-sm">{index + 1}</TableCell>
                  <TableCell className="text-xs sm:text-sm">
                    <div className="flex items-center gap-2">
                      <PlayerPicksModal player={entry}>
                        <Button variant="link" className="p-0 h-auto font-medium hover:underline">
                          <span className="truncate max-w-[100px] sm:max-w-none">{entry.nickname}</span>
                        </Button>
                      </PlayerPicksModal>
                      {entry.status === "ELIMINATED" && <Skull className="h-4 w-4 text-red-500" />}
                    </div>
                  </TableCell>
                  <TableCell className="text-center text-xs sm:text-sm">
                    <Badge
                      variant={entry.status === "ALIVE" ? "default" : "destructive"}
                      className={`text-xs ${entry.status === "ALIVE" ? "bg-green-500 hover:bg-green-600" : ""}`}
                    >
                      {entry.status === "ALIVE" ? "Alive" : "Out"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center font-medium text-xs sm:text-sm">{entry.current_streak}</TableCell>
                  <TableCell className="text-center text-xs sm:text-sm">{entry.correct_picks}</TableCell>
                  <TableCell className="text-center text-xs sm:text-sm">{entry.total_picks}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
      {visibleItems < allEntries.length && (
        <CardFooter className="justify-center border-t pt-4">
          <Button onClick={showMore} variant="outline">
            Show More ({allEntries.length - visibleItems} remaining)
          </Button>
        </CardFooter>
      )}
    </Card>
  )
}
