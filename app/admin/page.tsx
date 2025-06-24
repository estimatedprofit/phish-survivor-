export const dynamic = "force-dynamic"
export const revalidate = 0

import Link from "next/link"
import { getAvailablePools, getArchivedPools } from "@/lib/data"
import type { Pool } from "@/types"
import { PageHeader } from "@/components/shared/page-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { PlusCircle, AlertTriangle } from "lucide-react"
import { AdminPoolActionsClientWrapper } from "./admin-pool-actions-client-wrapper"
import { format, parseISO } from "date-fns" // Added parseISO

function PoolStatusBadge({ status }: { status: Pool["status"] }) {
  switch (status) {
    case "SIGNUPS_OPEN":
      return <Badge className="bg-green-500 hover:bg-green-600">Signups Open</Badge>
    case "ACTIVE":
      return <Badge className="bg-blue-500 hover:bg-blue-600 text-white">Active</Badge>
    case "COMPLETED":
      return <Badge variant="secondary">Completed</Badge>
    default:
      return <Badge variant="outline">{status}</Badge>
  }
}

export default async function AdminDashboardPage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const sp = await searchParams
  const view = sp?.view === "archived" ? "archived" : "active"
  const pools = view === "archived" ? await getArchivedPools() : await getAvailablePools()

  return (
    <div className="space-y-6">
      <PageHeader title="Admin Dashboard">
        <div className="flex gap-2">
          <Button variant={view === "active" ? "default" : "outline"} asChild size="sm">
            <Link href="/admin?view=active">Active Pools</Link>
          </Button>
          <Button variant={view === "archived" ? "default" : "outline"} asChild size="sm">
            <Link href="/admin?view=archived">Archived</Link>
          </Button>
        </div>
        <Button asChild>
          <Link href="/admin/create-pool">
            <PlusCircle className="mr-2 h-4 w-4" /> Create New Pool
          </Link>
        </Button>
      </PageHeader>

      <div className="border border-yellow-300 bg-yellow-50 p-4 rounded-md dark:bg-yellow-900/30 dark:border-yellow-700">
        <div className="flex items-start">
          <AlertTriangle className="h-5 w-5 text-yellow-600 mr-3 dark:text-yellow-400" />
          <div>
            <h3 className="font-semibold text-yellow-800 dark:text-yellow-200">Admin Panel</h3>
            <p className="text-sm text-yellow-700 dark:text-yellow-300">
              Manage survivor pools. Changes made here are live and affect the database.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {pools.map((pool) => (
          <Card key={pool.id} className="flex flex-col">
            <CardHeader>
              <div className="flex justify-between items-start">
                <CardTitle>{pool.name}</CardTitle>
                <div className="flex gap-2 items-center">
                  <PoolStatusBadge status={pool.status} />
                  {pool.isTestPool && <Badge className="bg-purple-600 hover:bg-purple-700">Test</Badge>}
                </div>
              </div>
              <CardDescription>
                ID: {pool.id} | {pool.visibility}
              </CardDescription>
              <CardDescription>Tour: {pool.tourName}</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow space-y-1 text-sm text-muted-foreground">
              <p>Entrants: {pool.totalEntrants}</p>
              <p>Active: {pool.activePlayers}</p>
              {pool.maxPlayers && <p>Max Players: {pool.maxPlayers}</p>}
              <p>
                Signups Close: {(() => {
                  if (!pool.signupDeadline) return "TBD"
                  try {
                    const d = parseISO(pool.signupDeadline)
                    if (isNaN(d.getTime())) throw new Error("Invalid date")
                    return format(d, "MMM d, yyyy h:mm a")
                  } catch {
                    return "TBD"
                  }
                })()}
              </p>
              {pool.pickLockOffsetHours != null && (
                <p>
                  Pick Lock: {pool.pickLockOffsetHours || 0}h {pool.pickLockOffsetMinutes || 0}m before
                </p>
              )}
            </CardContent>
            <CardFooter>
              <div className="flex flex-wrap gap-2 w-full">
                <AdminPoolActionsClientWrapper pool={pool} />
              </div>
            </CardFooter>
          </Card>
        ))}
      </div>
      {pools.length === 0 && <p className="text-muted-foreground">No pools found.</p>}
    </div>
  )
}
