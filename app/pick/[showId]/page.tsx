import { createSupabaseServerClient } from "@/lib/supabase/server"
import { getShowDetails, getAllSongs, getCurrentUser, getPoolDetails } from "@/lib/data"
import { PickFormClient } from "@/components/pick/pick-form-client"
import { PageHeader } from "@/components/shared/page-header"
import type { Metadata } from "next" // Removed ResolvingMetadata as it's not used

interface PickSongPageProps {
  params: Promise<{ showId: string }>
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export async function generateMetadata(
  { params, searchParams }: PickSongPageProps,
  // parent: ResolvingMetadata, // parent not used
): Promise<Metadata> {
  const supabase = await createSupabaseServerClient()
  const { showId } = await params
  const sp = await searchParams
  const poolId = sp?.poolId as string | undefined
  if (!poolId) return { title: "Error: Pool ID Missing" } // Handle missing poolId early

  const pool = await getPoolDetails(poolId, supabase)
  const show = await getShowDetails(showId, poolId, supabase)

  if (!show) {
    return {
      title: "Pick Not Found",
    }
  }
  return {
    title: `Pick for ${show.venue} - ${pool?.name || "Phish Survivor"}`,
    description: `Make your song pick for the show at ${show.venue} on ${show.date}.`,
  }
}

export default async function PickSongPage({ params, searchParams }: PickSongPageProps) {
  const { showId } = await params
  const sp = await searchParams
  const poolId = sp?.poolId as string | undefined
  const supabase = await createSupabaseServerClient()

  if (!poolId) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <PageHeader title="Pool Not Specified" description="A pool ID is required to make a pick." />
      </div>
    )
  }

  // Fetch pool first so we can bail early if the ID is wrong
  const pool = await getPoolDetails(poolId, supabase)
  if (!pool) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <PageHeader title="Pool Not Found" description="The specified pool could not be loaded." />
      </div>
    )
  }

  // Fetch show next – if not found we show friendly message instead of crashing
  const show = await getShowDetails(showId, poolId, supabase)
  if (!show) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <PageHeader title="Show Not Found" description="Could not find details for this show." />
      </div>
    )
  }

  // Remaining data isn't critical; wrap in try/catch so we can still render the form
  let allSongsList = [] as Awaited<ReturnType<typeof getAllSongs>>
  let currentUser = null as Awaited<ReturnType<typeof getCurrentUser>>
  try {
    ;[allSongsList, currentUser] = await Promise.all([
      getAllSongs(supabase),
      getCurrentUser(supabase, poolId),
    ])
  } catch (e) {
    console.error("[PickSongPage] Non-fatal data fetch error:", (e as Error).message)
  }

  return (
    <PickFormClient
      initialShow={show}
      initialPool={pool}
      initialAllSongs={allSongsList}
      initialCurrentUser={currentUser}
      poolIdFromQuery={poolId}
    />
  )
}
