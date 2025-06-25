import { getPoolDetails, getCurrentUser } from "@/lib/data"
import { redirect } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Users, Calendar, MapPin, Trophy, CheckCircle, Lock } from "lucide-react"
import { format, parseISO } from "date-fns"
import Link from "next/link"
import { JoinPoolButton } from "@/components/join-pool-button"

export const dynamic = "force-dynamic"

export default async function JoinPoolPage({ params, searchParams }: { params: { poolId: string }; searchParams: { [key: string]: string | string[] | undefined } }) {
  const { poolId } = params
  
  const pool = await getPoolDetails(poolId)
  if (!pool) {
    redirect("/")
  }

  const currentUser = await getCurrentUser()
  
  // Check if user is already in this pool
  if (currentUser) {
    const userInPool = await getCurrentUser(undefined, poolId)
    if (userInPool && userInPool.status === "ALIVE") {
      // User is already in the pool, redirect to dashboard
      redirect(`/dashboard?poolId=${poolId}`)
    }
  }

  return (
    <div className="container mx-auto py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          {searchParams?.invited === "1" ? (
            <>
              <h1 className="text-3xl font-bold mb-2">You've Been Invited!</h1>
              <p className="text-muted-foreground">Someone shared this Phish Survivor pool with you. Check out the details below.</p>
            </>
          ) : (
            <>
              <h1 className="text-3xl font-bold mb-2">Join this Survivor Pool</h1>
              <p className="text-muted-foreground">Review the details below and sign up to enter the game.</p>
            </>
          )}
        </div>

        <Card className="card-gradient">
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-2xl">{pool.name}</CardTitle>
                <CardDescription className="text-lg mt-1">{pool.tourName}</CardDescription>
              </div>
              <PoolStatusBadge status={pool.status} />
            </div>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {pool.description && (
              <p className="text-muted-foreground">{pool.description}</p>
            )}

            {/* Pool Stats */}
            <div className="bg-muted/50 rounded-lg p-4 space-y-3">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                Pool Stats
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-green-600" />
                  <div>
                    <div className="font-bold text-lg text-green-600">
                      {pool.activePlayers}
                    </div>
                    <div className="text-xs text-muted-foreground">Players Alive</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-blue-600" />
                  <div>
                    <div className="font-bold text-lg text-blue-600">
                      {pool.totalEntrants}
                    </div>
                    <div className="text-xs text-muted-foreground">Total Entries</div>
                  </div>
                </div>
              </div>
              
              {pool.maxPlayers && (
                <div className="pt-2 border-t border-muted-foreground/20">
                  <div className="text-xs text-muted-foreground">
                    Max Players: <span className="font-medium">{pool.maxPlayers}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Next Show Info */}
            {pool.nextShow && (
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30 rounded-lg p-4 border border-blue-200/50 dark:border-blue-800/50">
                <div className="flex items-center gap-2 mb-3">
                  <Calendar className="h-4 w-4 text-blue-600" />
                  <span className="font-medium text-sm text-blue-900 dark:text-blue-100">
                    Next Show
                  </span>
                </div>
                <div className="space-y-2">
                  <div className="font-semibold text-gray-900 dark:text-gray-100">
                    {pool.nextShow.venue_name}
                  </div>
                  <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
                    <MapPin className="h-4 w-4" />
                    {pool.nextShow.city_state}
                  </div>
                  <div className="text-sm text-blue-600 dark:text-blue-400 font-medium">
                    {format(parseISO(pool.nextShow.show_date), "EEEE, MMMM d, yyyy")}
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

            {/* Signup Deadline */}
            <div className="text-sm text-muted-foreground text-center p-3 bg-orange-50 dark:bg-orange-950/30 rounded-lg border border-orange-200/50 dark:border-orange-800/50">
              <Calendar className="inline mr-1.5 h-4 w-4" />
              Signups close: {(() => {
                if (!pool.signupDeadline) return "TBD"
                try {
                  const d = parseISO(pool.signupDeadline)
                  if (isNaN(d.getTime())) throw new Error("Invalid date")
                  return format(d, "EEEE, MMMM d, yyyy 'at' h:mm a")
                } catch {
                  return "TBD"
                }
              })()}
            </div>
          </CardContent>

          <CardFooter className="flex flex-col gap-3">
            {pool.status === "SIGNUPS_OPEN" ? (
              currentUser ? (
                <JoinPoolButton poolId={poolId} poolName={pool.name} />
              ) : (
                <div className="w-full space-y-3">
                  <Button asChild className="w-full">
                    <Link href={`/signup?poolId=${poolId}`}>
                      Sign Up & Join Pool
                    </Link>
                  </Button>
                  <p className="text-center text-sm text-muted-foreground">
                    Already have an account?{" "}
                    <Link href={`/login?poolId=${poolId}`} className="font-semibold text-primary hover:underline">
                      Log in here
                    </Link>
                  </p>
                </div>
              )
            ) : pool.status === "ACTIVE" ? (
              <div className="w-full text-center">
                <Button variant="outline" disabled className="w-full">
                  Pool is Active (Signups Closed)
                </Button>
                <p className="text-sm text-muted-foreground mt-2">
                  This pool has already started, but you can still view the action!
                </p>
                <Button variant="secondary" asChild className="w-full mt-2">
                  <Link href={`/dashboard?poolId=${poolId}`}>
                    View Pool Dashboard
                  </Link>
                </Button>
              </div>
            ) : (
              <Button variant="outline" disabled className="w-full">
                <Lock className="mr-2 h-4 w-4" />
                Pool Closed/Completed
              </Button>
            )}
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}

function PoolStatusBadge({ status }: { status: string }) {
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
        <Users className="mr-1 h-3 w-3" /> Active
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
  return <Badge variant="secondary">{status}</Badge>
}