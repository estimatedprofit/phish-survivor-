import type { PhishShow, User, Pool } from "@/types"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { CalendarDays, Clock, Lock, Edit3, CheckSquare, BarChart3 } from "lucide-react"
import { format, parseISO } from "date-fns"
import { formatInTimeZone } from "date-fns-tz"
import { LockedShowStatsModal } from "./locked-show-stats-modal"
import { TimeRemaining } from "@/components/dashboard/time-remaining"

interface UpcomingShowsSectionProps {
  shows: PhishShow[]
  userStatus: User["status"]
  pool: Pool
}

export function UpcomingShowsSection({ shows, userStatus, pool }: UpcomingShowsSectionProps) {
  const upcoming = shows.filter((s) => s.status === "UPCOMING" || s.status === "PICKS_LOCKED")
  if (upcoming.length === 0) {
    return <p className="text-muted-foreground">No upcoming shows with open picks.</p>
  }

  return (
    <section className="mb-8">
      <h2 className="text-2xl font-semibold mb-4">Upcoming Shows</h2>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {upcoming.map((show) => {
          const displayDeadline = show.pickDeadline ? parseISO(show.pickDeadline) : null

          return (
            <Card key={show.id}>
              <CardHeader>
                <CardTitle>{show.venue}</CardTitle>
                <CardDescription>{show.cityState}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center text-sm text-muted-foreground">
                  <CalendarDays className="mr-2 h-4 w-4" />
                  <span>{format(parseISO(show.date), "EEEE, MMMM d, yyyy")}</span>
                </div>
                {show.setTime && (
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Clock className="mr-2 h-4 w-4" />
                    <span>Show Time: {show.setTime}</span>
                  </div>
                )}
                {displayDeadline && (
                  <div className="flex flex-col text-sm text-orange-600 dark:text-orange-400">
                    <div className="flex items-center">
                      <Clock className="mr-2 h-4 w-4" />
                      <span>
                        Picks due: {formatInTimeZone(displayDeadline, show.timeZone || "America/New_York", "MMM d, h:mm a zzz")}
                      </span>
                    </div>
                    <span className="ml-6 text-xs">
                      <TimeRemaining deadline={displayDeadline} />
                    </span>
                  </div>
                )}
                {show.status === "UPCOMING" && userStatus === "ALIVE" && show.userPick && (
                  <div className="flex items-center text-sm text-blue-600 dark:text-blue-400 pt-2">
                    <CheckSquare className="mr-2 h-4 w-4" />
                    <span>
                      Your Pick: <span className="font-semibold">{show.userPick.songTitle}</span>
                    </span>
                  </div>
                )}
              </CardContent>
              <CardFooter className="flex flex-col gap-2">
                {show.status === "UPCOMING" && userStatus === "ALIVE" ? (
                  <Button asChild className="w-full">
                    <Link prefetch={false} href={`/pick/${show.id}?poolId=${pool.id}`}>
                      {show.userPick ? (
                        <>
                          <Edit3 className="mr-2 h-4 w-4" /> Change Your Pick
                        </>
                      ) : (
                        "Make Your Pick"
                      )}
                    </Link>
                  </Button>
                ) : show.status === "PICKS_LOCKED" ? (
                  <>
                    <Button variant="outline" disabled className="w-full bg-muted text-muted-foreground">
                      <Lock className="mr-2 h-4 w-4" /> Picks Locked
                    </Button>
                    {show.resultsSummary && show.resultsSummary.songPickCounts.length > 0 && (
                      <LockedShowStatsModal show={show}>
                        <Button variant="secondary" className="w-full">
                          <BarChart3 className="mr-2 h-4 w-4" /> View Pick Stats
                        </Button>
                      </LockedShowStatsModal>
                    )}
                  </>
                ) : userStatus === "OUT" ? (
                  <Button variant="outline" disabled className="w-full bg-muted text-muted-foreground">
                    You're Out
                  </Button>
                ) : null}
              </CardFooter>
            </Card>
          )
        })}
      </div>
    </section>
  )
}
