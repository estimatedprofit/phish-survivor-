"use client"

import { useActionState, useState, useEffect } from "react"
import { useFormStatus } from "react-dom"
import { processShowResultsAction, type ProcessShowResultsFormState } from "@/lib/actions"
import type { PhishShow, Song, Pool } from "@/types"
import { PageHeader } from "@/components/shared/page-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Loader2, CheckCircle, Info, ListMusic } from "lucide-react"
import { format, parseISO } from "date-fns"
import Link from "next/link"
import { SongMultiSelector } from "./song-multi-selector"
import { useRouter } from "next/navigation"

const initialState: ProcessShowResultsFormState = {
  message: "",
  success: false,
}

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing Results...
        </>
      ) : (
        "Finalize & Process Results"
      )}
    </Button>
  )
}

interface ProcessResultsFormProps {
  show: PhishShow
  pool: Pool
  allSongs: Song[]
}

export function ProcessResultsForm({ show, pool, allSongs }: ProcessResultsFormProps) {
  const router = useRouter()
  const [state, formAction] = useActionState(processShowResultsAction, initialState)
  const [selectedSetlistSongIds, setSelectedSetlistSongIds] = useState<string[]>(
    show.setlist?.map((song) => song.id) || [], // Initialize with existing setlist if available
  )

  useEffect(() => {
    if (state.success) {
      const timer = setTimeout(() => {
        router.push(`/admin/pool/${pool.id}`)
        router.refresh()
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [state.success, pool.id, router])

  return (
    <div className="max-w-2xl mx-auto">
      <PageHeader
        title={`Process Results: ${show.venue}`}
        description={`${show.cityState} - ${format(parseISO(show.date), "EEEE, MMMM d, yyyy")}`}
      >
        <Button variant="outline" asChild>
          <Link href={`/admin/pool/${pool.id}`}>Back to Pool Management</Link>
        </Button>
      </PageHeader>

      <form action={formAction}>
        <input type="hidden" name="showId" value={show.id} />
        <input type="hidden" name="poolId" value={pool.id} />
        <input type="hidden" name="setlistSongIds" value={selectedSetlistSongIds.join(",")} />

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <ListMusic className="mr-2 h-5 w-5" /> Enter Actual Setlist
            </CardTitle>
            <CardDescription>
              Select all songs that were played during this show. This will be used to grade all player picks.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SongMultiSelector
              allSongs={allSongs}
              initialSelectedSongIds={selectedSetlistSongIds} // Pass initial selection
              onChange={(ids) => setSelectedSetlistSongIds(ids)}
            />
          </CardContent>
          <CardFooter className="flex flex-col gap-4 pt-6">
            <SubmitButton />
            {state.message && (
              <Alert
                variant={state.success ? "default" : "destructive"}
                className={
                  state.success ? "bg-green-50 border-green-300 dark:bg-green-900/30 dark:border-green-700" : ""
                }
              >
                {state.success ? <CheckCircle className="h-4 w-4" /> : <Info className="h-4 w-4" />}
                <AlertTitle>{state.success ? "Success!" : "Notice"}</AlertTitle>
                <AlertDescription>{state.message}</AlertDescription>
              </Alert>
            )}
          </CardFooter>
        </Card>
      </form>
    </div>
  )
}
