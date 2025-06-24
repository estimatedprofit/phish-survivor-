import { NextResponse } from "next/server"
import { createSupabaseAdminClient } from "@/lib/supabase/server"

const isUUID = (str?: string | null) => {
  if (!str) return false
  return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(str)
}

export async function GET(
  _req: Request,
  { params }: { params: { poolId: string; showId: string } },
) {
  const { poolId, showId } = params

  if (!isUUID(poolId) || !isUUID(showId)) {
    return NextResponse.json({ error: "Invalid IDs" }, { status: 400 })
  }

  const supabase = createSupabaseAdminClient()

  const { data, error } = await supabase
    .from("picks")
    .select(
      `song_id,
       songs ( title ),
       pool_participants!inner ( profiles ( nickname ) )`,
    )
    .eq("show_id", showId)
    .eq("pool_participants.pool_id", poolId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (!data) return NextResponse.json({ stats: [] })

  const statsMap: Record<
    string,
    { songId: string; songTitle: string; nicknames: string[]; count: number }
  > = {}

  data.forEach((row: any) => {
    const songId: string = row.song_id
    const title: string = row.songs?.title || "Unknown"
    const nickname: string =
      row.pool_participants?.profiles?.nickname || "Anonymous"
    if (!statsMap[songId]) {
      statsMap[songId] = {
        songId,
        songTitle: title,
        nicknames: [],
        count: 0,
      }
    }
    statsMap[songId].count += 1
    statsMap[songId].nicknames.push(nickname)
  })

  const stats = Object.values(statsMap).sort((a, b) => b.count - a.count)

  return NextResponse.json({ stats })
} 