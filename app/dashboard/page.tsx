import Link from "next/link"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { getCurrentUser, getPoolDetails, getShows, getLeaderboard, getAllSongs } from "@/lib/data"
import { DashboardClient } from "@/components/dashboard/dashboard-client"
import { redirect } from "next/navigation"
import { PageHeader } from "@/components/shared/page-header" // Added PageHeader
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { format, parseISO } from "date-fns"

export const dynamic = "force-dynamic"

export default async function DashboardPage({
  searchParams: rawSearchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const searchParams = await rawSearchParams
  const poolIdFromUrl = searchParams?.poolId as string | undefined
  // Simple debug, safe after awaiting
  console.log(`[DashboardPage] poolId param:`, poolIdFromUrl)

  const supabase = await createSupabaseServerClient()
  let user = await getCurrentUser(supabase)

  if (!user) {
    const loginRedirectUrl = poolIdFromUrl ? `/login?poolId=${poolIdFromUrl}` : "/login"
    redirect(loginRedirectUrl)
  }

  let pool = await getPoolDetails(poolIdFromUrl, supabase)
  console.log(`[DashboardPage] Result of getPoolDetails for poolId "${poolIdFromUrl}":`, JSON.stringify(pool, null, 2))

  if (!pool) {
    // The user might not have specified a pool, or the poolId might be invalid.
    // Let's determine which pools this user belongs to and handle accordingly.

    const { data: participantRows } = await supabase
      .from("pool_participants")
      .select("pool_id")
      .eq("user_id", user.id)

    const userPoolIds: string[] = (participantRows || []).map((row: any) => row.pool_id)

    if (userPoolIds.length === 0) {
      // User is not in any pools – keep the existing message.
      return (
        <div className="container mx-auto py-8">
          <PageHeader title="Dashboard" description="Please select a pool to view." />
          <p className="text-center text-muted-foreground mt-10">
            You have not joined any pools yet. Browse the{" "}
            <Link href="/" className="text-primary hover:underline">
              available pools
            </Link>{" "}
            to get started.
          </p>
        </div>
      )
    }

    if (userPoolIds.length === 1) {
      // Exactly one pool – redirect directly to its dashboard.
      redirect(`/dashboard?poolId=${userPoolIds[0]}`)
    }

    // Multiple pools – show selection page.

    // Fetch pool details for each pool.
    const pools = (
      await Promise.all(userPoolIds.map((id) => getPoolDetails(id, supabase)))
    ).filter(Boolean) as Awaited<ReturnType<typeof getPoolDetails>>[]

    // For each pool, determine the next pick deadline (if any).
    const poolsWithNextPick = await Promise.all(
      pools.map(async (p) => {
        const shows = await getShows(p!, supabase)
        // Find the earliest upcoming or picks_locked show.
        const upcomingShow = shows
          .filter((s) => s.status === "UPCOMING" || s.status === "PICKS_LOCKED")
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0]

        return {
          pool: p,
          nextPickDeadline: upcomingShow?.pickDeadline,
        }
      }),
    )

    return (
      <div className="container mx-auto py-8">
        <PageHeader title="Select a Pool" description="Choose which pool dashboard you want to view." />
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
          {poolsWithNextPick.map(({ pool: p, nextPickDeadline }) => (
            p && (
            <Card key={p.id} className="flex flex-col">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle>{p.name}</CardTitle>
                </div>
                <CardDescription>{p.tourName}</CardDescription>
              </CardHeader>
              <CardContent className="flex-grow space-y-3">
                <div className="text-sm text-muted-foreground">
                  {p.activePlayers} / {p.totalEntrants} users active
                </div>
                {nextPickDeadline && (
                  <div className="text-sm text-muted-foreground">
                    Next pick due: {format(parseISO(nextPickDeadline), "MMM d, yyyy h:mm a")}
                  </div>
                )}
              </CardContent>
              <CardFooter>
                <Button className="w-full" asChild>
                  <Link href={`/dashboard?poolId=${p.id}`}>View Dashboard</Link>
                </Button>
              </CardFooter>
            </Card>
            )
          ))}
        </div>
      </div>
    )
  }

  // Re-fetch the user with the pool context
  user = await getCurrentUser(supabase, pool.id)
  if (!user) redirect("/login") // Should not happen

  // Auto-join user to the pool if it's open and they are not already a participant
  if (pool.status === "SIGNUPS_OPEN") {
    const { data: existingParticipant } = await supabase
      .from("pool_participants")
      .select("id")
      .eq("user_id", user.id)
      .eq("pool_id", pool.id)
      .maybeSingle()

    if (!existingParticipant) {
      const { error: insertError } = await supabase.from("pool_participants").insert({
        user_id: user.id,
        pool_id: pool.id,
      })

      if (insertError) {
        console.error(`[DashboardPage] Failed to auto-join user ${user.id} to pool ${pool.id}:`, insertError.message)
      } else {
        pool = await getPoolDetails(poolIdFromUrl, supabase) // Re-fetch pool details
        if (!pool) {
          return <div>Error: Could not reload pool details after joining.</div>
        }
      }
    }
  }

  const [shows, leaderboardEntries, allSongsList] = await Promise.all([
    getShows(pool, supabase),
    getLeaderboard(pool.id, supabase),
    getAllSongs(supabase),
  ])

  return (
    <DashboardClient
      initialUser={user}
      initialPool={pool}
      initialShows={shows}
      initialLeaderboard={leaderboardEntries}
      initialSongs={allSongsList}
    />
  )
}
