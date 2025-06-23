"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useActionState } from "react"
import { useFormStatus } from "react-dom"
import { submitPick, type PickSongFormState } from "@/lib/actions"
import type { PhishShow, Song, User, Pool } from "@/types"
import { PageHeader } from "@/components/shared/page-header"
import { SongSelector } from "@/components/song-selector"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Clock, Info, Loader2, Check, Ban, Lock } from "lucide-react" // Added Lock
import { format, parseISO } from "date-fns"
import Link from "next/link"

const initialState: PickSongFormState = {
  message: "",
  success: false,
}

function SubmitPickButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending || disabled} className="w-full">
      {pending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Locking Pick...
        </>
      ) : (
        "Lock In Your Pick"
      )}
    </Button>
  )
}

interface PickFormClientProps {
  initialShow: PhishShow
  initialPool: Pool
  initialAllSongs: Song[]
  initialCurrentUser: User | null
  poolIdFromQuery?: string
}

export function PickFormClient({
  initialShow,
  initialPool,
  initialAllSongs,
  initialCurrentUser,
  poolIdFromQuery,
}: PickFormClientProps) {
  const router = useRouter()
  const [show] = useState<PhishShow>(initialShow)
  const [currentPool] = useState<Pool>(initialPool)
  const [allSongs] = useState<Song[]>(initialAllSongs)
  const [currentUser] = useState<User | null>(initialCurrentUser)
  const [selectedSong, setSelectedSong] = useState<Song | null>(
    initialShow.userPick ? initialAllSongs.find((s) => s.id === initialShow.userPick!.songId) || null : null,
  )

  const [formState, formAction] = useActionState(submitPick, initialState)

  useEffect(() => {
    if (formState.success && formState.pick) {
      const redirectPoolId = poolIdFromQuery || currentPool.id
      setTimeout(() => router.push(`/dashboard?poolId=${redirectPoolId}`), 1500)
    }
  }, [formState, router, currentPool.id, poolIdFromQuery])

  if (!currentUser) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <CardTitle>Authentication Required</CardTitle>
          </CardHeader>
          <CardContent>
            <Info className="h-12 w-12 mx-auto text-blue-500 mb-4" />
            <p>You need to be logged in to make a pick.</p>
          </CardContent>
          <CardFooter>
            <Button asChild className="w-full">
              <Link href={`/login?redirect=/pick/${show.id}${poolIdFromQuery ? `?poolId=${poolIdFromQuery}` : ""}`}>
                Login
              </Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  const displayDeadline = show.pickDeadline ? parseISO(show.pickDeadline) : null
  const picksLocked =
    currentPool.isTestPool
      ? false
      : show.status !== "UPCOMING" || (displayDeadline && new Date() > displayDeadline)

  if (picksLocked) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <CardTitle>Picks Locked for {show.venue}</CardTitle>
            <CardDescription>{format(parseISO(show.date), "EEEE, MMMM d, yyyy")}</CardDescription>
          </CardHeader>
          <CardContent>
            <Lock className="h-12 w-12 mx-auto text-blue-500 mb-4" />
            <p>The deadline for making picks for this show has passed. Good luck!</p>
            {displayDeadline && (
              <p className="text-xs text-muted-foreground mt-1">
                Deadline was: {format(displayDeadline, "MMM d, yyyy 'at' h:mm a zzz")}
              </p>
            )}
          </CardContent>
          <CardFooter>
            <Button asChild className="w-full">
              <Link href={`/dashboard?poolId=${currentPool.id}`}>Back to Dashboard</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  if (currentUser?.status === "OUT") {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <CardTitle>You're Out!</CardTitle>
            <CardDescription>Unfortunately, you've been eliminated from this pool.</CardDescription>
          </CardHeader>
          <CardContent>
            <Ban className="h-12 w-12 mx-auto text-destructive mb-4" />
            <p>You can no longer make picks, but you can still follow the action!</p>
          </CardContent>
          <CardFooter>
            <Button asChild className="w-full">
              <Link href={`/dashboard?poolId=${currentPool.id}`}>Back to Dashboard</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  const pickedSongIdsForThisPool = currentUser.pickedSongIdsThisPool || []
  const isSelectedSongAlreadyPicked = selectedSong ? pickedSongIdsForThisPool.includes(selectedSong.id) : false

  return (
    <div className="max-w-2xl mx-auto">
      <PageHeader
        title={`Pick for: ${show.venue}`}
        description={`${show.cityState} - ${format(parseISO(show.date), "EEEE, MMMM d, yyyy")}`}
      />

      {displayDeadline && (
        <Alert className="mb-6 border-orange-500 text-orange-700 dark:border-orange-400 dark:text-orange-300">
          <Clock className="h-5 w-5" />
          <AlertTitle>Pick Deadline</AlertTitle>
          <AlertDescription>
            Picks must be locked in by{" "}
            <span className="font-semibold">{format(displayDeadline, "MMM d, yyyy 'at' h:mm a zzz")}</span>.
          </AlertDescription>
        </Alert>
      )}

      <form action={formAction}>
        <input type="hidden" name="showId" value={show.id} />
        <input type="hidden" name="poolId" value={currentPool.id} />
        {selectedSong && <input type="hidden" name="songId" value={selectedSong.id} />}
        {selectedSong && <input type="hidden" name="songTitle" value={selectedSong.title} />}
        <Card>
          <CardHeader>
            <CardTitle>Select Your Song</CardTitle>
            <CardDescription>
              Choose one song you think Phish will play. Remember, you can't pick a song you've chosen before in this
              pool!
            </CardDescription>
          </CardHeader>
          <CardContent>
            {allSongs.length > 0 ? (
              <SongSelector
                allSongs={allSongs}
                pickedSongIds={pickedSongIdsForThisPool}
                onSelectSong={setSelectedSong}
                currentPick={selectedSong}
              />
            ) : (
              <p>Loading songs...</p>
            )}
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <SubmitPickButton disabled={!selectedSong || isSelectedSongAlreadyPicked} />
            {formState.message && (
              <Alert
                variant={formState.success ? "default" : "destructive"}
                className={
                  formState.success ? "bg-green-50 border-green-300 dark:bg-green-900/30 dark:border-green-700" : ""
                }
              >
                {formState.success ? <Check className="h-4 w-4" /> : <Info className="h-4 w-4" />}
                <AlertTitle>{formState.success ? "Success!" : "Notice"}</AlertTitle>
                <AlertDescription>{formState.message}</AlertDescription>
              </Alert>
            )}
          </CardFooter>
        </Card>
      </form>
    </div>
  )
}
