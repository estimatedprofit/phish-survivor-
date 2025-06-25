"use client"

import { useState, useMemo, useEffect } from "react"
import { useRouter } from "next/navigation"
import type { User, Pool, PhishShow, LeaderboardEntry, Song } from "@/types"
import { PageHeader } from "@/components/shared/page-header"
import { UserStatusBanner } from "@/components/dashboard/user-status-banner"
import { DashboardStats } from "@/components/dashboard/dashboard-stats"
import { UpcomingShowsSection } from "@/components/dashboard/upcoming-shows-section"
import { PastShowsSection } from "@/components/dashboard/past-shows-section"
import { LeaderboardTable } from "@/components/dashboard/leaderboard-table"
import { Separator } from "@/components/ui/separator"
import { Loader2 } from "lucide-react"
import { SharePoolButton } from "@/components/dashboard/share-pool-button"

type LeaderboardFilter = "ALL" | "ALIVE"

interface DashboardClientProps {
  initialUser: User | null
  initialPool: Pool | undefined
  initialShows: PhishShow[]
  initialLeaderboard: LeaderboardEntry[]
  initialSongs: Song[]
}

export function DashboardClient({
  initialUser,
  initialPool,
  initialShows,
  initialLeaderboard,
  initialSongs,
}: DashboardClientProps) {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(initialUser)
  const [pool, setPool] = useState<Pool | null>(initialPool || null)
  const [shows] = useState<PhishShow[]>(initialShows)
  const [allLeaderboardEntries] = useState<LeaderboardEntry[]>(initialLeaderboard)
  const [allSongsList] = useState<Song[]>(initialSongs)
  const [leaderboardFilter, setLeaderboardFilter] = useState<LeaderboardFilter>("ALL")
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!initialUser) {
      router.push("/login")
    } else {
      setUser(initialUser)
      setPool(initialPool || null)
      setIsLoading(false)
    }
  }, [initialUser, initialPool, router])

  // Ensure page starts at top when navigating here
  useEffect(() => {
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" })
    }
  }, [])

  const handleShowAllEntrants = () => setLeaderboardFilter("ALL")
  const handleShowActivePlayers = () => setLeaderboardFilter("ALIVE")

  const filteredLeaderboardEntries = useMemo(() => {
    if (leaderboardFilter === "ALIVE") {
      return allLeaderboardEntries.filter((entry) => entry.status === "ALIVE")
    }
    return allLeaderboardEntries
  }, [allLeaderboardEntries, leaderboardFilter])

  // Determine in-progress (PICKS_LOCKED) and next upcoming (UPCOMING)
  const inProgressShow = shows.find((s) => s.status === "PICKS_LOCKED")
  const nextShow = shows.find((s) => s.status === "UPCOMING" && s.id !== inProgressShow?.id)

  if (isLoading || !user || !pool) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-lg mt-4">Loading Phishiest Dashboard...</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <PageHeader title={`${pool.name} Pool`} description={`Welcome ${user.nickname}!`}>
        <SharePoolButton poolId={pool.id} />
      </PageHeader>
      <UserStatusBanner user={user} />
      <DashboardStats
        pool={pool}
        user={user}
        allSongs={allSongsList}
        onShowAllEntrants={handleShowAllEntrants}
        onShowActivePlayers={handleShowActivePlayers}
        currentFilter={leaderboardFilter}
      />
      <Separator />
      {/* In-Progress Show Section */}
      {inProgressShow && (
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">In-Progress Show</h2>
          <UpcomingShowsSection shows={[inProgressShow]} userStatus={user.status} pool={pool} />
        </section>
      )}

      {/* Next Show Section */}
      {nextShow && (
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Next Show</h2>
          <UpcomingShowsSection shows={[nextShow]} userStatus={user.status} pool={pool} />
        </section>
      )}

      {/* Upcoming shows excluding the in-progress & next show */}
      <UpcomingShowsSection
        shows={shows.filter((s) => s.status === "UPCOMING" && s.id !== nextShow?.id)}
        userStatus={user.status}
        pool={pool}
      />
      <Separator />
      <PastShowsSection shows={shows} />
      <Separator />
      <LeaderboardTable
        entries={filteredLeaderboardEntries}
        title={leaderboardFilter === "ALIVE" ? "Leaderboard - Active Players" : "Leaderboard - All Entrants"}
      />
    </div>
  )
}
