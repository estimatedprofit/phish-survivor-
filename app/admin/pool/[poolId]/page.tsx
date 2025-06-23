import { createSupabaseServerClient } from "@/lib/supabase/server"
import { getPoolDetails, getShows } from "@/lib/data"
import { PageHeader } from "@/components/shared/page-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { ChevronLeft, Play, Check, Clock } from "lucide-react"
import { format, parseISO } from "date-fns"
import { ImportShowsButton } from "@/components/admin/import-shows-button"
import { ActiveToggle } from "@/components/admin/active-toggle"

export const dynamic = "force-dynamic"

function ShowStatusBadge({ status }: { status: "UPCOMING" | "PICKS_LOCKED" | "PLAYED" }) {
  switch (status) {
    case "UPCOMING":
      return (
        <Badge variant="secondary">
          <Clock className="mr-1 h-3 w-3" /> Upcoming
        </Badge>
      )
    case "PICKS_LOCKED":
      return (
        <Badge variant="default" className="bg-orange-500 hover:bg-orange-600">
          <Clock className="mr-1 h-3 w-3" /> Picks Locked
        </Badge>
      )
    case "PLAYED":
      return (
        <Badge variant="outline">
          <Check className="mr-1 h-3 w-3" /> Played
        </Badge>
      )
    default:
      return <Badge variant="secondary">{status}</Badge>
  }
}

export default async function AdminPoolDetailPage({ params }: { params: Promise<{ poolId: string }> }) {
  const paramsObj = await params
  const { poolId } = paramsObj
  const supabase = await createSupabaseServerClient()
  const pool = await getPoolDetails(poolId, supabase)

  if (!pool) {
    return (
      <div>
        <PageHeader title="Pool Not Found" />
        <p>The pool with ID "{poolId}" could not be found.</p>
      </div>
    )
  }

  const shows = await getShows(pool, supabase, true)

  return (
    <div className="space-y-6">
      <PageHeader title={`Manage Pool: ${pool.name}`} description={`Tour: ${pool.tourName}`}>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/admin">
              <ChevronLeft className="mr-2 h-4 w-4" />
              Back to All Pools
            </Link>
          </Button>
          {pool.isTestPool ? (
            <ImportShowsButton poolId={pool.id} year={2026} />
          ) : (
            <ImportShowsButton poolId={pool.id} />
          )}
          {pool.isTestPool && (
            <form method="GET" action="/api/cron/process-shows">
              <input type="hidden" name="poolId" value={pool.id} />
              <Button type="submit" variant="default">Run Scoring Now</Button>
            </form>
          )}
        </div>
        {pool.isTestPool && <Badge className="bg-purple-600 ml-2">Test Mode</Badge>}
      </PageHeader>

      <Card>
        <CardHeader>
          <CardTitle>Shows in this Pool</CardTitle>
          <CardDescription>
            Here you can view all shows for this pool and process results after a show has been played.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Venue</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {shows.map((show) => (
                <TableRow key={show.id}>
                  <TableCell>{format(parseISO(show.date), "MMM d, yyyy")}</TableCell>
                  <TableCell>{show.venue}</TableCell>
                  <TableCell>
                    <ShowStatusBadge status={show.status} />
                  </TableCell>
                  <TableCell className="text-right flex gap-2 justify-end">
                    <ActiveToggle showId={show.id} isActive={show.isActive} />
                    {show.status !== "PLAYED" ? (
                      <Link href={`/admin/process-results/${show.id}?poolId=${pool.id}`} passHref legacyBehavior>
                        <Button asChild variant="default" size="sm">
                          <a>
                            <Play className="mr-2 h-4 w-4" /> Process Results
                          </a>
                        </Button>
                      </Link>
                    ) : (
                      <Link href={`/admin/process-results/${show.id}?poolId=${pool.id}`} passHref legacyBehavior>
                        <Button asChild variant="outline" size="sm">
                          <a>View Results</a>
                        </Button>
                      </Link>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {shows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    No shows have been added to this pool yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
