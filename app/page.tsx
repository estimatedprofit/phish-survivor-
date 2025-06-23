import { Badge } from "@/components/ui/badge"
import { getAvailablePools, getCurrentUser } from "@/lib/data"
import type { Pool } from "@/types"
import { PageHeader } from "@/components/shared/page-header"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import {
  Users,
  CalendarClock,
  CheckCircle,
  PlayCircle,
  Lock,
  Trophy,
  ChevronRight,
  Edit3,
  ShieldCheck,
  LogIn,
  TrendingUp,
  Zap,
  MapPin,
  Calendar,
} from "lucide-react"
import { format, parseISO } from "date-fns" // Added parseISO

export const dynamic = "force-dynamic"

function PoolStatusBadge({ status }: { status: Pool["status"] }) {
  if (status === "SIGNUPS_OPEN") {
    return (
      <Badge variant="default" className="bg-green-500 hover:bg-green-600">
        <Users className="mr-1 h-3 w-3" /> Signups Open
      </Badge>
    )
  }
  if (status === "ACTIVE") {
    return (
      <Badge variant="secondary" className="bg-blue-500 text-white hover:bg-blue-600">
        <PlayCircle className="mr-1 h-3 w-3" /> Active
      </Badge>
    )
  }
  if (status === "COMPLETED") {
    return (
      <Badge variant="outline">
        <CheckCircle className="mr-1 h-3 w-3" /> Completed
      </Badge>
    )
  }
  return <Badge variant="secondary">{String(status)}</Badge>
}

export default async function HomePage() {
  const [allPools, currentUser] = await Promise.all([getAvailablePools(), getCurrentUser()])

  const publicPools = allPools.filter((pool) => pool.visibility === "public")

  return (
    <div>
      <section className="hero-background w-full min-h-[50vh] sm:min-h-[40vh] flex flex-col items-center justify-center text-center text-white p-4 sm:p-6">
        <div className="relative z-10">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold">
            <span className="inline-block tracking-[1px]">Phish Survivor</span>
          </h1>
          <p className="mt-2 text-lg sm:text-xl font-medium tracking-wide sm:tracking-widest text-white/90 px-2">
            Pick a song every show. No repeats. Last phan standing wins.
          </p>
          <div className="mt-6 mb-6 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 px-2">
            <div className="flex items-center gap-2 rounded-full bg-zinc-900/80 px-4 py-2 text-white shadow-md">
              <Users className="h-4 w-4 text-cyan-300" />
              <span className="font-medium text-xs sm:text-sm">1. Join Pool</span>
            </div>
            <ChevronRight className="h-6 w-6 text-zinc-900/50 hidden sm:block" />
            <div className="flex items-center gap-2 rounded-full bg-zinc-900/80 px-4 py-2 text-white shadow-md">
              <Edit3 className="h-4 w-4 text-cyan-300" />
              <span className="font-medium text-xs sm:text-sm">2. Make Your Pick</span>
            </div>
            <ChevronRight className="h-6 w-6 text-zinc-900/50 hidden sm:block" />
            <div className="flex items-center gap-2 rounded-full bg-zinc-900/80 px-4 py-2 text-white shadow-md">
              <ShieldCheck className="h-4 w-4 text-cyan-300" />
              <span className="font-medium text-xs sm:text-sm">3. Survive & Advance</span>
            </div>
            <ChevronRight className="h-6 w-6 text-zinc-900/50 hidden sm:block" />
            <div className="flex items-center gap-2 rounded-full bg-zinc-900/80 px-4 py-2 text-white shadow-md">
              <Trophy className="h-4 w-4 text-cyan-300" />
              <span className="font-medium text-xs sm:text-sm">�� Win It All</span>
            </div>
          </div>
        </div>
      </section>

      <section id="available-pools" className="pt-6 sm:pt-8 pb-8 sm:pb-12">
        <PageHeader title="Available Public Pools" />
        {publicPools && publicPools.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {publicPools.map((pool) => {
              if (!pool || typeof pool.id === "undefined") {
                console.error("Encountered an invalid pool object:", pool)
                return null
              }
              return (
                <Card key={pool.id} className="flex flex-col card-gradient relative overflow-hidden">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <CardTitle>{pool.name || "Unnamed Pool"}</CardTitle>
                      <PoolStatusBadge status={pool.status} />
                    </div>
                    <CardDescription>{pool.tourName || "N/A"}</CardDescription>
                  </CardHeader>
                  <CardContent className="flex-grow space-y-3">
                    {pool.description && <p className="text-sm text-muted-foreground">{pool.description}</p>}
                    
                    {/* Player Stats - Always visible */}
                    <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-green-600" />
                          <span className="font-medium text-sm">Players Alive</span>
                        </div>
                        <span className="font-bold text-lg text-green-600">
                          {pool.activePlayers || 0}
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <TrendingUp className="h-4 w-4 text-blue-600" />
                          <span className="font-medium text-sm">Total Entries</span>
                        </div>
                        <span className="font-bold text-lg text-blue-600">
                          {pool.totalEntrants || 0}
                        </span>
                      </div>
                      
                      {pool.maxPlayers && (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Zap className="h-4 w-4 text-orange-600" />
                            <span className="font-medium text-sm">Max Players</span>
                          </div>
                          <span className="font-bold text-lg text-orange-600">
                            {pool.maxPlayers}
                          </span>
                        </div>
                      )}
                      
                      {/* Survival Rate */}
                      {(pool.totalEntrants || 0) > 0 && (
                        <div className="pt-2 border-t border-muted-foreground/20">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">Survival Rate</span>
                            <span className="text-xs font-medium">
                              {Math.round(((pool.activePlayers || 0) / (pool.totalEntrants || 1)) * 100)}%
                            </span>
                          </div>
                          <div className="mt-1 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-gradient-to-r from-green-500 to-green-400 transition-all duration-300"
                              style={{ width: `${Math.round(((pool.activePlayers || 0) / (pool.totalEntrants || 1)) * 100)}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* Next Show Info - Always visible for active pools */}
                    {pool.nextShow && (pool.status === "ACTIVE" || pool.status === "SIGNUPS_OPEN") && (
                      <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30 rounded-lg p-3 border border-blue-200/50 dark:border-blue-800/50">
                        <div className="flex items-center gap-2 mb-2">
                          <Calendar className="h-4 w-4 text-blue-600" />
                          <span className="font-medium text-sm text-blue-900 dark:text-blue-100">
                            Next Show
                          </span>
                        </div>
                        <div className="space-y-1">
                          <div className="font-semibold text-sm text-gray-900 dark:text-gray-100">
                            {pool.nextShow.venue_name}
                          </div>
                          <div className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400">
                            <MapPin className="h-3 w-3" />
                            {pool.nextShow.city_state}
                          </div>
                          <div className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                            {format(parseISO(pool.nextShow.show_date), "MMM d, yyyy")}
                            {pool.nextShow.status === "PICKS_LOCKED" && (
                              <span className="ml-2 inline-flex items-center gap-1">
                                <Lock className="h-3 w-3" />
                                Picks Locked
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* Completed Pool Info */}
                    {pool.status === "COMPLETED" && (
                      <div className="bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-950/30 dark:to-yellow-950/30 rounded-lg p-3 border border-amber-200/50 dark:border-amber-800/50">
                        <div className="flex items-center gap-2 mb-2">
                          <Trophy className="h-4 w-4 text-amber-600" />
                          <span className="font-medium text-sm text-amber-900 dark:text-amber-100">
                            Pool Complete
                          </span>
                        </div>
                        <div className="text-xs text-amber-700 dark:text-amber-300">
                          {pool.activePlayers > 1 
                            ? `${pool.activePlayers} survivors remain!` 
                            : pool.activePlayers === 1 
                            ? "We have a winner!" 
                            : "All players eliminated"}
                        </div>
                      </div>
                    )}
                    
                    <div className="text-sm text-muted-foreground">
                      <CalendarClock className="inline mr-1.5 h-4 w-4" />
                      Signups close:{" "}
                      {pool.signupDeadline ? format(parseISO(pool.signupDeadline), "MMM d, yyyy h:mm a") : "N/A"}
                    </div>
                  </CardContent>
                  <CardFooter>
                    {pool.status === "SIGNUPS_OPEN" ? (
                      currentUser ? (
                        <Button className="w-full" asChild>
                          <Link href={`/join/${pool.id}`}>
                            <LogIn className="mr-2 h-4 w-4" /> Join Pool
                          </Link>
                        </Button>
                      ) : (
                        <Button className="w-full" asChild>
                          <Link href={`/join/${pool.id}`}>Join Pool</Link>
                        </Button>
                      )
                    ) : pool.status === "ACTIVE" ? (
                      <Button className="w-full" variant="outline" asChild>
                        <Link href={`/dashboard?poolId=${pool.id}`}>View Dashboard</Link>
                      </Button>
                    ) : (
                      <Button className="w-full" variant="outline" disabled>
                        <Lock className="mr-2 h-4 w-4" />
                        Pool Closed/Completed
                      </Button>
                    )}
                  </CardFooter>
                </Card>
              )
            })}
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="mx-auto w-24 h-24 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center mb-6">
              <Users className="h-12 w-12 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold mb-2">No Pools Available</h3>
            <p className="text-muted-foreground">Check back soon for new survivor pools!</p>
          </div>
        )}
      </section>
    </div>
  )
}
