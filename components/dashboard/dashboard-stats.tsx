"use client"

import type { Pool, User, Song } from "@/types"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Users, UserCheck, CalendarClock, Flame, Trophy, Music, BarChart } from "lucide-react"
import { format, parseISO, formatDistanceToNowStrict } from "date-fns" // Added parseISO and formatDistanceToNowStrict
import { cn } from "@/lib/utils"

interface DashboardStatsProps {
  pool: Pool
  user: User
  allSongs: Song[]
  onShowAllEntrants: () => void
  onShowActivePlayers: () => void
  currentFilter: "ALL" | "ALIVE"
}

export function DashboardStats({
  pool,
  user,
  allSongs,
  onShowAllEntrants,
  onShowActivePlayers,
  currentFilter,
}: DashboardStatsProps) {
  if (!pool || !user) return null

  const pickedSongTitles = user.pickedSongIdsThisPool
    .map((id) => allSongs.find((song) => song.id === id)?.title)
    .filter(Boolean) as string[]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {/* My Stats Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xs sm:text-sm font-medium">My Stats</CardTitle>
          <Flame className="h-4 w-4 text-orange-500" />
        </CardHeader>
        <CardContent className="pb-2">
          <div className="text-2xl font-bold">{user.currentStreak ?? 0}</div>
          <p className="text-xs text-muted-foreground">Current Streak</p>
        </CardContent>
        <CardFooter className="pt-1">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="link" className="p-0 h-auto text-xs text-muted-foreground">
                {pickedSongTitles.length} Songs Picked
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>All Songs Picked (This Pool)</DialogTitle>
                <DialogDescription>
                  You've picked {pickedSongTitles.length} song{pickedSongTitles.length === 1 ? "" : "s"} so far.
                </DialogDescription>
              </DialogHeader>
              <ScrollArea className="h-[200px] my-4 pr-3">
                <ul className="space-y-1">
                  {pickedSongTitles.map((title, index) => (
                    <li key={index} className="text-sm text-muted-foreground">
                      - {title}
                    </li>
                  ))}
                </ul>
              </ScrollArea>
            </DialogContent>
          </Dialog>
        </CardFooter>
      </Card>

      {/* Total Entrants Card */}
      <Card
        onClick={onShowAllEntrants}
        className={cn(
          "cursor-pointer hover:shadow-md transition-shadow",
          currentFilter === "ALL" && "ring-2 ring-primary shadow-lg",
        )}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xs sm:text-sm font-medium">Total Entrants</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{pool.totalEntrants}</div>
          <p className="text-xs text-muted-foreground">Fans in the pool</p>
        </CardContent>
      </Card>

      {/* Active Players Card */}
      <Card
        onClick={onShowActivePlayers}
        className={cn(
          "cursor-pointer hover:shadow-md transition-shadow",
          currentFilter === "ALIVE" && "ring-2 ring-primary shadow-lg",
        )}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xs sm:text-sm font-medium">Active Players</CardTitle>
          <UserCheck className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{pool.activePlayers}</div>
          <p className="text-xs text-muted-foreground">Still in the running</p>
        </CardContent>
      </Card>

      {/* Signup Deadline Card (optional) */}
      {pool.signupDeadline && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Signup Deadline</CardTitle>
            <CalendarClock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {(() => {
              try {
                const d = parseISO(pool.signupDeadline)
                if (isNaN(d.getTime())) throw new Error("Invalid date")
                return (
                  <>
                    <div className="text-xl font-bold">{format(d, "MMM d, yyyy h:mm a zzz")}</div>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNowStrict(d, { addSuffix: true })}
                    </p>
                  </>
                )
              } catch {
                return <div className="text-xl font-bold">TBD</div>
              }
            })()}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
