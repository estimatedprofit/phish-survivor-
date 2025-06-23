"use client"

import type React from "react"

import type { LeaderboardEntry, Pick } from "@/types"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"

interface PlayerPicksModalProps {
  player: LeaderboardEntry
  children: React.ReactNode // To use as DialogTrigger
}

const PickResultBadgeSmall = ({ result }: { result: Pick["result"] }) => {
  if (result === "WIN")
    return (
      <Badge
        variant="default"
        className="bg-green-100 text-green-700 dark:bg-green-800 dark:text-green-200 text-xs px-1.5 py-0.5"
      >
        WIN
      </Badge>
    )
  if (result === "LOSE")
    return (
      <Badge variant="destructive" className="text-xs px-1.5 py-0.5">
        LOSE
      </Badge>
    )
  return (
    <Badge variant="secondary" className="text-xs px-1.5 py-0.5">
      PENDING
    </Badge>
  )
}

export function PlayerPicksModal({ player, children }: PlayerPicksModalProps) {
  const sortedPicks = player.allPicks.sort((a, b) => new Date(b.showDate!).getTime() - new Date(a.showDate!).getTime())

  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[625px]">
        <DialogHeader>
          <DialogTitle>Pick History: {player.nickname}</DialogTitle>
          <DialogDescription>
            Status:{" "}
            <Badge
              variant={player.status === "ALIVE" ? "default" : "secondary"}
              className={
                player.status === "ALIVE"
                  ? "bg-green-100 text-green-700 dark:bg-green-800 dark:text-green-200"
                  : "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200"
              }
            >
              {player.status}
            </Badge>
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-[400px] pr-4">
          {sortedPicks.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Show Date</TableHead>
                  <TableHead>Venue</TableHead>
                  <TableHead>Pick</TableHead>
                  <TableHead>Result</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedPicks.map((pick) => (
                  <TableRow key={pick.id}>
                    <TableCell>{format(new Date(pick.showDate!), "MMM d, yyyy")}</TableCell>
                    <TableCell className="truncate max-w-[150px]">{pick.showVenue}</TableCell>
                    <TableCell>{pick.songTitle}</TableCell>
                    <TableCell>
                      <PickResultBadgeSmall result={pick.result} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-muted-foreground text-center py-4">No picks made yet.</p>
          )}
        </ScrollArea>
        <div className="pt-4 flex justify-end">
          <DialogTrigger asChild>
            <Button variant="outline">Close</Button>
          </DialogTrigger>
        </div>
      </DialogContent>
    </Dialog>
  )
}
