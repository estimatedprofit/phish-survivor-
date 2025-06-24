import { createSupabaseServerClient } from "@/lib/supabase/server"
import { getShowDetails, getAllSongs, getPoolDetails } from "@/lib/data"
import { ProcessResultsForm } from "@/components/admin/process-results-form"
import { PageHeader } from "@/components/shared/page-header"
import type { Metadata } from "next"

interface ProcessResultsPageProps {
  params: Promise<{ showId: string }>
  searchParams: { [key: string]: string | string[] | undefined }
}

export async function generateMetadata({ params, searchParams }: ProcessResultsPageProps): Promise<Metadata> {
  const supabase = await createSupabaseServerClient()
  const paramsObj = await params
  const { showId } = paramsObj
  const sp = searchParams
  const poolId = sp?.poolId as string | undefined
  if (!poolId) return { title: "Error: Pool ID missing" }

  const pool = await getPoolDetails(poolId, supabase)
  const show = await getShowDetails(showId, poolId, supabase)

  if (!show || !pool) {
    return {
      title: "Admin: Show/Pool Not Found",
    }
  }
  return {
    title: `Admin: Process Results for ${show.venue} - ${pool.name}`,
    description: `Enter setlist and process results for the show at ${show.venue} on ${show.date}.`,
    robots: { index: false, follow: false },
  }
}

export default async function ProcessResultsPage({ params, searchParams }: ProcessResultsPageProps) {
  const supabase = await createSupabaseServerClient()
  const paramsObj = await params
  const { showId } = paramsObj
  const sp = searchParams
  const poolId = sp?.poolId as string | undefined

  if (!poolId) {
    return (
      <div className="container mx-auto py-8">
        <PageHeader title="Error" description="Pool ID is missing from the request." />
      </div>
    )
  }

  const [show, pool, allSongsList] = await Promise.all([
    getShowDetails(showId, poolId, supabase),
    getPoolDetails(poolId, supabase),
    getAllSongs(supabase),
  ])

  if (!pool) {
    return (
      <div className="container mx-auto py-8">
        <PageHeader title="Error" description={`Pool with ID "${poolId}" not found.`} />
      </div>
    )
  }

  if (!show) {
    return (
      <div className="container mx-auto py-8">
        <PageHeader title="Error" description={`Show with ID "${showId}" not found in pool "${pool.name}".`} />
      </div>
    )
  }

  return <ProcessResultsForm show={show} pool={pool} allSongs={allSongsList} />
}
