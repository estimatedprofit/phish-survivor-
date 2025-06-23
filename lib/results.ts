// Shared helper used by the admin UI and the cron job
// Grades picks, updates participant status, stores setlist, and revalidates pages.

import { createSupabaseAdminClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function processShowResultsInternal({
  showId,
  poolId,
  setlistSongIds,
}: {
  showId: string
  poolId: string
  setlistSongIds: string[]
}) {
  const supabase = createSupabaseAdminClient()
  if (!showId || !poolId || setlistSongIds.length === 0) {
    return { success: false, message: "Missing required data" }
  }

  // Fetch alive participants
  const { data: participants, error: partErr } = await supabase
    .from("pool_participants")
    .select("id, current_streak")
    .eq("pool_id", poolId)
    .eq("status", "ALIVE")

  if (partErr) return { success: false, message: partErr.message }

  const participantIds = (participants || []).map((p: any) => p.id)

  const { data: picks, error: picksErr } = await supabase
    .from("picks")
    .select("id, song_id, pool_participant_id")
    .eq("show_id", showId)
    .in("pool_participant_id", participantIds.length ? participantIds : ["00000000-0000-0000-0000-000000000000"])

  if (picksErr) return { success: false, message: picksErr.message }

  let winners = 0
  let losers = 0
  const pickMap = new Map<string, any>()
  picks?.forEach((p: any) => pickMap.set(p.pool_participant_id, p))

  // Update picks and participants
  for (const participant of participants || []) {
    const pick = pickMap.get(participant.id)
    if (!pick) {
      losers++
      await supabase.from("pool_participants").update({ status: "OUT", current_streak: 0 }).eq("id", participant.id)
      continue
    }
    const correct = setlistSongIds.includes(pick.song_id)
    await supabase.from("picks").update({ result: correct ? "WIN" : "LOSE" }).eq("id", pick.id)

    if (correct) {
      winners++
      await supabase
        .from("pool_participants")
        .update({ current_streak: (participant.current_streak || 0) + 1 })
        .eq("id", participant.id)
    } else {
      losers++
      await supabase.from("pool_participants").update({ status: "OUT", current_streak: 0 }).eq("id", participant.id)
    }
  }

  await supabase.from("shows").update({ status: "PLAYED", setlist: setlistSongIds }).eq("id", showId)

  revalidatePath(`/admin/pool/${poolId}`)
  revalidatePath(`/dashboard?poolId=${poolId}`, "layout")

  return { success: true, message: "Processed", winners, losers }
} 