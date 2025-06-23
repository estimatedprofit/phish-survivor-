export const dynamic = "force-dynamic"

import { createSupabaseServerClient } from "@/lib/supabase/server"
import { getPoolDetails, getPoolParticipantsWithProfiles } from "@/lib/data"
import type { PoolParticipantWithProfile } from "@/types"
import { PageHeader } from "@/components/shared/page-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { ChevronLeft, UserCog } from "lucide-react"
import { format, parseISO } from "date-fns"
import { ManagePlayerStatusClient } from "./manage-player-status-client"

function ParticipantStatusBadge({ status }: { status: PoolParticipantWithProfile["status"] }) {
  switch (status) {
    case "ALIVE":
      return (
        <Badge variant="default" className="bg-green-500 hover:bg-green-600">
          ALIVE
        </Badge>
      )
    case "OUT":
      return (
        <Badge variant="destructive" className="bg-red-500 hover:bg-red-600">
          OUT
        </Badge>
      )
    default:
      return <Badge variant="secondary">{status}</Badge>
  }
}

export default async function AdminManagePlayersPage({ params }: { params: Promise<{ poolId: string }> }) {
  const paramsObj = await params
  const { poolId } = paramsObj
  const supabase = await createSupabaseServerClient()
  const pool = await getPoolDetails(poolId, supabase)

  if (!pool) {
    return (
      <div>
        <PageHeader title="Pool Not Found" />
        <p>The pool with ID "{poolId}" could not be found.</p>
        <Button variant="outline" asChild className="mt-4">
          <Link href="/admin">
            <ChevronLeft className="mr-2 h-4 w-4" />
            Back to All Pools
          </Link>
        </Button>
      </div>
    )
  }

  const participants = await getPoolParticipantsWithProfiles(pool.id, supabase)

  return (
    <div className="space-y-6">
      <PageHeader title={`Manage Players: ${pool.name}`} description={`View and update participant statuses.`}>
        <Button variant="outline" asChild>
          <Link href={`/admin/pool/${pool.id}`}>
            <ChevronLeft className="mr-2 h-4 w-4" />
            Back to Pool Details
          </Link>
        </Button>
      </PageHeader>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <UserCog className="mr-2 h-5 w-5" /> Pool Participants ({participants.length})
          </CardTitle>
          <CardDescription>
            Manage the status of players in this pool. Changes are effective immediately.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nickname</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Joined At</TableHead>
                <TableHead>Current Streak</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {participants.map((participant) => (
                <TableRow key={participant.participantId}>
                  <TableCell className="font-medium">{participant.nickname}</TableCell>
                  <TableCell className="text-muted-foreground">{participant.email}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {format(parseISO(participant.joinedAt), "MMM d, yyyy h:mm a")}
                  </TableCell>
                  <TableCell>{participant.currentStreak}</TableCell>
                  <TableCell>
                    <ParticipantStatusBadge status={participant.status} />
                  </TableCell>
                  <TableCell className="text-right">
                    <ManagePlayerStatusClient participant={participant} poolId={pool.id} />
                  </TableCell>
                </TableRow>
              ))}
              {participants.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    No participants in this pool yet.
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
