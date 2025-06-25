// Mock data and functions to simulate API calls
import type { User, Pool, PhishShow, Song, LeaderboardEntry, Pick } from "@/types"
import type { PoolParticipantWithProfile } from "@/types"
import { subHours, subMinutes, isPast, parseISO } from "date-fns"
import { createSupabaseServerClient, createSupabaseAdminClient, type TypedSupabaseClient } from "@/lib/supabase/server"
import { fromZonedTime } from "date-fns-tz"

// Helper to check if a string is a UUID
const isUUID = (str: string | null | undefined): boolean => {
  if (!str) return false
  const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/
  return uuidRegex.test(str)
}

// Helper function to get a Supabase client
async function getSupabase(providedClient?: TypedSupabaseClient): Promise<TypedSupabaseClient> {
  if (providedClient) return providedClient
  return await createSupabaseServerClient()
}

/**
 * Fetches the current user.
 * If a poolId is provided, it enriches the user object with pool-specific data
 * like their status, streak, and picks for that pool.
 */
export const getCurrentUser = async (
  providedSupabase?: TypedSupabaseClient,
  poolId?: string,
): Promise<(User & { role?: string; profileId?: string }) | null> => {
  const supabase = await getSupabase(providedSupabase)
  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !authUser) {
    if (authError) console.error("[getCurrentUser] Auth error:", authError.message)
    return null
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, nickname, role")
    .eq("id", authUser.id)
    .single()

  if (profileError && profileError.code !== "PGRST116") {
    // PGRST116 means no rows found, which is okay if profile not created yet
    console.error(`[getCurrentUser] Profile error for user ${authUser.id}:`, profileError.message)
  }

  const baseUser = {
    id: authUser.id,
    email: authUser.email || "No email provided",
    nickname: profile?.nickname || authUser.user_metadata?.nickname || "Phan (Fallback)",
    role: profile?.role || authUser.user_metadata?.role || "user",
    profileId: profile?.id || authUser.id,
  }

  if (!poolId || !isUUID(poolId)) {
    return {
      ...baseUser,
      status: "ALIVE",
      picks: [],
      pickedSongIdsThisPool: [],
      currentStreak: 0,
    }
  }

  const { data: participant, error: participantError } = await supabase
    .from("pool_participants")
    .select("id, status, current_streak")
    .eq("user_id", authUser.id)
    .eq("pool_id", poolId)
    .single()

  if (participantError || !participant) {
    return {
      ...baseUser,
      status: "ALIVE",
      picks: [],
      pickedSongIdsThisPool: [],
      currentStreak: 0,
    }
  }

  const { data: picksData, error: picksError } = await supabase
    .from("picks")
    .select("song_id, result")
    .eq("pool_participant_id", participant.id)

  if (picksError) {
    console.error(`[getCurrentUser] Error fetching picks for participant ${participant.id}:`, picksError.message)
  }

  // Only consider picks that have been scored (WIN/LOSE).  Pending picks shouldn't block the song.
  const finalizedSongIds = (picksData || []).filter((p: any) => p.result && p.result !== "PENDING").map((p: any) => p.song_id)

  const pickedSongIds = finalizedSongIds

  return {
    ...baseUser,
    status: participant.status as "ALIVE" | "OUT",
    currentStreak: participant.current_streak || 0,
    picks: [],
    pickedSongIdsThisPool: pickedSongIds,
  }
}

export const getPoolDetails = async (
  poolId?: string,
  providedSupabase?: TypedSupabaseClient,
): Promise<Pool | undefined> => {
  const supabase = providedSupabase ? providedSupabase : createSupabaseAdminClient()
  const trimmedPoolId = poolId?.trim()

  if (!trimmedPoolId || !isUUID(trimmedPoolId)) {
    console.log(`[getPoolDetails] Invalid or missing poolId: "${poolId}". Returning undefined.`)
    return undefined
  }

  const { data: dbPool, error } = await supabase
    .from("pools")
    .select(
      `
id, name, description, tour_name, signup_deadline, status, visibility, max_players, is_test_pool, pick_lock_time,
pick_lock_offset_hours, pick_lock_offset_minutes,
pool_participants(status)
`,
    )
    .eq("id", trimmedPoolId)
    .neq("visibility", "archived")
    .single()

  if (error || !dbPool) {
    if (error) console.error(`[getPoolDetails] Supabase ERROR for pool ID "${trimmedPoolId}": ${error.message}`)
    else console.log(`[getPoolDetails] No pool found for ID "${trimmedPoolId}".`)
    return undefined
  }

  const totalEntrants = dbPool.pool_participants.length
  const activePlayers = dbPool.pool_participants.filter((p: any) => p.status === "ALIVE").length

  return {
    id: dbPool.id,
    name: dbPool.name,
    description: dbPool.description || undefined,
    tourName: dbPool.tour_name,
    signupDeadline: dbPool.signup_deadline,
    status: dbPool.status as Pool["status"],
    visibility: dbPool.visibility as Pool["visibility"],
    maxPlayers: dbPool.max_players || undefined,
    isTestPool: dbPool.is_test_pool,
    pickLockOffsetHours: dbPool.pick_lock_offset_hours === null ? undefined : dbPool.pick_lock_offset_hours,
    pickLockOffsetMinutes: dbPool.pick_lock_offset_minutes === null ? undefined : dbPool.pick_lock_offset_minutes,
    pickLockTimeOfDay: dbPool.pick_lock_time || undefined,
    totalEntrants,
    activePlayers,
  }
}

export const getAvailablePools = async (providedSupabase?: TypedSupabaseClient): Promise<Pool[]> => {
  const supabaseAdmin = createSupabaseAdminClient()
  const { data: poolsData, error } = await supabaseAdmin
    .from("pools")
    .select(
      `
id, name, description, tour_name, signup_deadline, status, visibility, max_players, is_test_pool, pick_lock_time,
pool_participants(status)
`,
    )
    .neq("visibility", "archived")
    .order("signup_deadline", { ascending: true })

  if (error) {
    console.error("[getAvailablePools] Error fetching pools:", error.message)
    return []
  }
  if (!poolsData) return []

  // Get next upcoming show for each pool
  const poolsWithShows = await Promise.all(
    poolsData.map(async (dbPool) => {
      // Get the next upcoming show for this pool
      const { data: nextShow } = await supabaseAdmin
        .from("shows")
        .select("show_date, venue_name, city_state, status")
        .eq("pool_id", dbPool.id)
        .eq("is_active", true)
        .in("status", ["UPCOMING", "PICKS_LOCKED"])
        .order("show_date", { ascending: true })
        .limit(1)
        .single()

      return {
        id: dbPool.id,
        name: dbPool.name,
        description: dbPool.description || undefined,
        tourName: dbPool.tour_name,
        signupDeadline: dbPool.signup_deadline,
        status: dbPool.status as Pool["status"],
        visibility: dbPool.visibility as Pool["visibility"],
        maxPlayers: dbPool.max_players || undefined,
        isTestPool: dbPool.is_test_pool,
        totalEntrants: dbPool.pool_participants.length,
        activePlayers: dbPool.pool_participants.filter((p: any) => p.status === "ALIVE").length,
        nextShow: nextShow || undefined,
      }
    })
  )

  return poolsWithShows
}

// Fetch pools that have been archived (visibility = 'archived') so Admins can view history.
export const getArchivedPools = async (providedSupabase?: TypedSupabaseClient): Promise<Pool[]> => {
  const supabase = await getSupabase(providedSupabase)
  const { data: poolsData, error } = await supabase
    .from("pools")
    .select(
      `
id, name, description, tour_name, signup_deadline, status, visibility, max_players, is_test_pool, pick_lock_time,
pool_participants(status)
`,
    )
    .eq("visibility", "archived")
    .order("signup_deadline", { ascending: true })

  if (error) {
    console.error("[getArchivedPools] Error fetching pools:", error.message)
    return []
  }
  if (!poolsData) return []

  return poolsData.map((dbPool) => ({
    id: dbPool.id,
    name: dbPool.name,
    description: dbPool.description || undefined,
    tourName: dbPool.tour_name,
    signupDeadline: dbPool.signup_deadline,
    status: dbPool.status as Pool["status"],
    visibility: dbPool.visibility as Pool["visibility"],
    maxPlayers: dbPool.max_players || undefined,
    isTestPool: dbPool.is_test_pool,
    totalEntrants: dbPool.pool_participants.length,
    activePlayers: dbPool.pool_participants.filter((p: any) => p.status === "ALIVE").length,
  }))
}

// -----------------------------------------------------------------------------
// Time-zone helpers
// -----------------------------------------------------------------------------

// Rough mapping of U.S. state abbreviations → primary IANA time-zone.
// For states that span multiple zones we pick the one most Phish venues use.
// Canada / international shows will still fall back to Eastern.
const STATE_TZ_MAP: Record<string, string> = {
  // Eastern
  CT: "America/New_York",
  DC: "America/New_York",
  DE: "America/New_York",
  FL: "America/New_York",
  GA: "America/New_York",
  ME: "America/New_York",
  MD: "America/New_York",
  MA: "America/New_York",
  MI: "America/Detroit",
  NC: "America/New_York",
  NH: "America/New_York",
  NJ: "America/New_York",
  NY: "America/New_York",
  OH: "America/New_York",
  PA: "America/New_York",
  RI: "America/New_York",
  SC: "America/New_York",
  VT: "America/New_York",
  VA: "America/New_York",
  WV: "America/New_York",

  // Central
  AR: "America/Chicago",
  IA: "America/Chicago",
  IL: "America/Chicago",
  KS: "America/Chicago",
  KY: "America/New_York", // KY mostly Eastern for shows (e.g., Lexington, Louisville)
  LA: "America/Chicago",
  MN: "America/Chicago",
  MO: "America/Chicago",
  MS: "America/Chicago",
  OK: "America/Chicago",
  TN: "America/Chicago",
  TX: "America/Chicago",
  WI: "America/Chicago",

  // Mountain
  AZ: "America/Phoenix",
  CO: "America/Denver",
  ID: "America/Boise",
  MT: "America/Denver",
  NM: "America/Denver",
  UT: "America/Denver",
  WY: "America/Denver",

  // Pacific
  CA: "America/Los_Angeles",
  NV: "America/Los_Angeles",
  OR: "America/Los_Angeles",
  WA: "America/Los_Angeles",
}

export const inferTimezone = (cityState?: string): string => {
  if (!cityState) return "America/New_York"
  const parts = cityState.split(",").map((p) => p.trim())
  const stateCode = parts.length > 1 ? parts[1].toUpperCase() : ""
  return STATE_TZ_MAP[stateCode] || "America/New_York"
}

// Helper to get a Date object for the show's start time in UTC, using the venue's
// inferred time zone where possible. If setTimeStr is missing/invalid, defaults
// to 7:00 PM local.
const getShowDateTime = (showDateStr: string, setTimeStr?: string, cityState?: string): Date | null => {
  const datePart = showDateStr

  let hours = 19 // default 7 PM
  let minutes = 0

  if (setTimeStr) {
    const m = setTimeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i)
    if (m) {
      hours = parseInt(m[1], 10)
      minutes = parseInt(m[2], 10)
      const ampm = m[3]?.toUpperCase()
      if (ampm === "PM" && hours < 12) hours += 12
      if (ampm === "AM" && hours === 12) hours = 0
    }
  }

  const tz = inferTimezone(cityState)
  const localStr = `${datePart} ${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`
  try {
    const utcDate = fromZonedTime(localStr, tz)
    return utcDate
  } catch {
    return null
  }
}

export const getShows = async (
  pool: Pool,
  providedSupabase?: TypedSupabaseClient,
  includeInactive: boolean = false,
): Promise<PhishShow[]> => {
  const supabase = await getSupabase(providedSupabase)
  const currentUser = await getCurrentUser(supabase, pool.id)

  const query = supabase
    .from("shows")
    .select("id, phish_net_show_id, show_date, event_date, venue_name, city_state, set_time, status, setlist, is_active")
    .eq("pool_id", pool.id)

  if (!includeInactive) {
    query.eq("is_active", true)
  }

  const { data: dbShows, error: showsError } = await query.order("show_date", { ascending: true })

  if (showsError) {
    console.error(`[getShows] Error fetching shows for pool ${pool.id}:`, showsError.message)
    return []
  }
  if (!dbShows) return []

  const userPicksForPoolMap: Map<string, Pick> = new Map()
  if (currentUser) {
    const { data: participantData } = await supabase
      .from("pool_participants")
      .select("id")
      .eq("user_id", currentUser.id)
      .eq("pool_id", pool.id)
      .single()

    if (participantData) {
      const { data: picksData } = await supabase
        .from("picks")
        .select("id, show_id, song_id, picked_at, result, songs (id, title)") // Select song id and title
        .eq("pool_participant_id", participantData.id)

      if (picksData) {
        picksData.forEach((p: any) => {
          userPicksForPoolMap.set(p.show_id, {
            id: p.id,
            userId: currentUser.id,
            showId: p.show_id,
            songId: p.song_id,
            songTitle: p.songs?.title || "Unknown Song",
            lockedAt: p.picked_at,
            result: p.result as Pick["result"],
          })
        })
      }
    }
  }

  // Fetch all songs once to map setlist IDs to Song objects
  const allSongs = await getAllSongs(supabase)
  const songsMap = new Map(allSongs.map((song) => [song.id, song]))

  return dbShows.map((dbShow) => {
    let calculatedPickDeadline: Date | null = null
    if (pool.pickLockTimeOfDay) {
      // Fixed time of day lock
      const tz = inferTimezone(dbShow.city_state || undefined)
      const localStr = `${dbShow.show_date} ${pool.pickLockTimeOfDay}`
      try {
        calculatedPickDeadline = fromZonedTime(localStr, tz)
      } catch {
        calculatedPickDeadline = null
      }
    } else {
      const showDateTime = getShowDateTime(
        dbShow.show_date,
        (dbShow as any).set_time as string | undefined,
        (dbShow as any).city_state as string | undefined,
      )

      if (showDateTime) {
        let tempDeadline = new Date(showDateTime.getTime())
        if (pool.pickLockOffsetHours != null) tempDeadline = subHours(tempDeadline, pool.pickLockOffsetHours)
        if (pool.pickLockOffsetMinutes != null) tempDeadline = subMinutes(tempDeadline, pool.pickLockOffsetMinutes)
        calculatedPickDeadline = tempDeadline
      }
    }

    let currentStatus = dbShow.status as PhishShow["status"]
    if (!pool.isTestPool && currentStatus === "UPCOMING" && calculatedPickDeadline && isPast(calculatedPickDeadline)) {
      currentStatus = "PICKS_LOCKED"
    }

    // Map setlist song IDs to Song objects
    const setlistSongs: Song[] = []
    if (dbShow.setlist && Array.isArray(dbShow.setlist)) {
      dbShow.setlist.forEach((songId: string) => {
        const song = songsMap.get(songId)
        if (song) {
          setlistSongs.push(song)
        }
      })
    }

    return {
      id: dbShow.id,
      phishNetShowId: dbShow.phish_net_show_id || "",
      date: dbShow.show_date,
      eventDate: dbShow.event_date || dbShow.show_date,
      venue: dbShow.venue_name,
      cityState: dbShow.city_state || "",
      timeZone: inferTimezone(dbShow.city_state || undefined),
      status: currentStatus,
      setTime: dbShow.set_time || undefined,
      pickDeadline: calculatedPickDeadline ? calculatedPickDeadline.toISOString() : undefined,
      userPick: userPicksForPoolMap.get(dbShow.id),
      setlist: setlistSongs, // Use the mapped Song objects
      resultsSummary: undefined, // TODO: Implement results summary fetching
      isActive: dbShow.is_active,
    }
  })
}

export const getShowDetails = async (
  showId: string,
  poolId: string,
  providedSupabase?: TypedSupabaseClient,
): Promise<PhishShow | undefined> => {
  const supabase = await getSupabase(providedSupabase)
  console.log(`[getShowDetails] Fetching showId: "${showId}" for poolId: "${poolId}"`)

  if (!isUUID(showId) || !isUUID(poolId)) {
    console.error(`[getShowDetails] Invalid UUID format for showId or poolId.`)
    return undefined
  }

  const pool = await getPoolDetails(poolId, supabase)
  if (!pool) {
    console.error(`[getShowDetails] Could not find pool with id: "${poolId}"`)
    return undefined
  }

  const { data: dbShow, error: showEror } = await supabase
    .from("shows")
    .select("id, phish_net_show_id, show_date, event_date, venue_name, city_state, set_time, status, setlist, is_active")
    .eq("id", showId)
    .eq("pool_id", poolId)
    .single()

  if (showEror || !dbShow) {
    console.error(
      `[getShowDetails] Error fetching show from DB. ShowId: ${showId}, PoolId: ${poolId}. Error: ${showEror?.message}`,
    )
    return undefined
  }

  const currentUser = await getCurrentUser(supabase, pool.id)
  const userPicksForPoolMap: Map<string, Pick> = new Map()
  if (currentUser) {
    const { data: participantData } = await supabase
      .from("pool_participants")
      .select("id")
      .eq("user_id", currentUser.id)
      .eq("pool_id", pool.id)
      .single()

    if (participantData) {
      const { data: pickData } = await supabase
        .from("picks")
        .select("id, show_id, song_id, picked_at, result, songs (id, title)") // Select song id and title
        .eq("pool_participant_id", participantData.id)
        .eq("show_id", dbShow.id)
        .single()

      if (pickData) {
        userPicksForPoolMap.set(pickData.show_id, {
          id: pickData.id,
          userId: currentUser.id,
          showId: pickData.show_id,
          songId: pickData.song_id,
          songTitle: (pickData.songs as any)?.title || "Unknown Song",
          lockedAt: pickData.picked_at,
          result: pickData.result as Pick["result"],
        })
      }
    }
  }

  // Fetch all songs once to map setlist IDs to Song objects
  const allSongs = await getAllSongs(supabase)
  const songsMap = new Map(allSongs.map((song) => [song.id, song]))

  let calculatedPickDeadline: Date | null = null
  if (pool.pickLockTimeOfDay) {
    // Fixed time of day lock
    const tz = inferTimezone(dbShow.city_state || undefined)
    const localStr = `${dbShow.show_date} ${pool.pickLockTimeOfDay}`
    try {
      calculatedPickDeadline = fromZonedTime(localStr, tz)
    } catch {
      calculatedPickDeadline = null
    }
  } else {
    const showDateTime = getShowDateTime(
      dbShow.show_date,
      (dbShow as any).set_time as string | undefined,
      (dbShow as any).city_state as string | undefined,
    )

    if (showDateTime) {
      let tempDeadline = new Date(showDateTime.getTime())
      if (pool.pickLockOffsetHours != null) tempDeadline = subHours(tempDeadline, pool.pickLockOffsetHours)
      if (pool.pickLockOffsetMinutes != null) tempDeadline = subMinutes(tempDeadline, pool.pickLockOffsetMinutes)
      calculatedPickDeadline = tempDeadline
    }
  }

  let currentStatus = dbShow.status as PhishShow["status"]
  if (!pool.isTestPool && currentStatus === "UPCOMING" && calculatedPickDeadline && isPast(calculatedPickDeadline)) {
    currentStatus = "PICKS_LOCKED"
  }

  // Map setlist song IDs to Song objects
  const setlistSongs: Song[] = []
  if (dbShow.setlist && Array.isArray(dbShow.setlist)) {
    dbShow.setlist.forEach((songId: string) => {
      const song = songsMap.get(songId)
      if (song) {
        setlistSongs.push(song)
      }
    })
  }

  console.log(`[getShowDetails] Successfully found and processed show: "${dbShow.venue_name}"`)
  return {
    id: dbShow.id,
    phishNetShowId: dbShow.phish_net_show_id || "",
    date: dbShow.show_date,
    eventDate: dbShow.event_date || dbShow.show_date,
    venue: dbShow.venue_name,
    cityState: dbShow.city_state || "",
    timeZone: inferTimezone(dbShow.city_state || undefined),
    status: currentStatus,
    setTime: dbShow.set_time || undefined,
    pickDeadline: calculatedPickDeadline ? calculatedPickDeadline.toISOString() : undefined,
    userPick: userPicksForPoolMap.get(dbShow.id),
    setlist: setlistSongs, // Use the mapped Song objects
    resultsSummary: undefined,
    isActive: dbShow.is_active,
  }
}

export const getLeaderboard = async (
  poolId: string,
  providedSupabase?: TypedSupabaseClient,
): Promise<LeaderboardEntry[]> => {
  const supabase = createSupabaseAdminClient()
  if (!isUUID(poolId)) return []

  // Fetch pool details to use pick lock offsets for visibility rules
  const pool = await getPoolDetails(poolId, supabase)
  if (!pool) {
    console.error(`[getLeaderboard] Pool not found for id ${poolId}`)
    return []
  }

  const { data, error } = await supabase
    .from("pool_participants")
    .select(
      `
status,
current_streak,
profiles (id, nickname),
picks (
  id,
  song_id,
  show_id,
  picked_at,
  result,
  songs (title),
  shows (show_date, venue_name, set_time, city_state, status)
)
`,
    )
    .eq("pool_id", poolId)
    .order("current_streak", { ascending: false, foreignTable: undefined }) // Order by streak first
    .order("status", { ascending: true }) // ALIVE first, then OUT

  if (error) {
    console.error(`[getLeaderboard] Error fetching leaderboard data for pool ${poolId}:`, error.message)
    return []
  }

  const leaderboardEntries: LeaderboardEntry[] = data.map((participant: any, index) => {
    // Compute which picks are visible based on pick-lock deadline
    const allPicks: Pick[] =
      (participant.picks || []).filter((p: any) => {
        const show = p.shows
        if (!show) return false // Shouldn't happen

        // Always visible if show status already moved beyond UPCOMING (i.e., PICKS_LOCKED or PLAYED)
        if (show.status && show.status !== "UPCOMING") return true

        // Otherwise, compute if pick deadline has passed
        const showDateStr = show.show_date as string | undefined
        if (!showDateStr) return false

        const showDateTime = getShowDateTime(
          showDateStr,
          (show as any).set_time as string | undefined,
          (show as any).city_state as string | undefined,
        )
        if (!showDateTime) return false

        let deadline: Date | null = null
        if (pool.pickLockTimeOfDay) {
          const tz = inferTimezone((show as any).city_state || undefined)
          const localStr = `${showDateStr} ${pool.pickLockTimeOfDay}`
          try {
            deadline = fromZonedTime(localStr, tz)
          } catch {
            deadline = null
          }
        } else {
          deadline = new Date(showDateTime.getTime())
          if (pool.pickLockOffsetHours != null) deadline = subHours(deadline, pool.pickLockOffsetHours)
          if (pool.pickLockOffsetMinutes != null) deadline = subMinutes(deadline, pool.pickLockOffsetMinutes)
        }

        return deadline ? isPast(deadline) : false
      })
      .map((p: any) => ({
        id: p.id,
        userId: participant.profiles.id,
        songId: p.song_id,
        showId: p.show_id,
        songTitle: p.songs?.title || "Unknown",
        result: p.result,
        lockedAt: p.picked_at,
        showDate: p.shows?.show_date,
        showVenue: p.shows?.venue_name,
      }))

    const correctPicks = allPicks.filter((p) => p.result === "WIN").length
    return {
      userId: participant.profiles.id,
      rank: index + 1,
      nickname: participant.profiles.nickname,
      status: participant.status,
      lastPick: allPicks.sort((a, b) => new Date(b.showDate!).getTime() - new Date(a.showDate!).getTime())[0]?.songTitle || "-",
      allPicks,
      current_streak: participant.current_streak || 0,
      correct_picks: correctPicks,
      total_picks: allPicks.length,
    }
  })

  return leaderboardEntries
}

export const getAllSongs = async (providedSupabase?: TypedSupabaseClient): Promise<Song[]> => {
  try {
    const supabase = await getSupabase(providedSupabase)
    const { data, error } = await supabase.from("songs").select("id, title, phish_net_song_id, times_played")
    if (error) throw new Error(error.message)
    if (!data) return []
    return data.map((row) => ({
      id: row.id,
      phishNetSongId: row.phish_net_song_id || undefined,
      title: row.title,
      timesPlayed: row.times_played === null ? undefined : row.times_played,
    }))
  } catch (e: any) {
    console.error("[getAllSongs] Failed to fetch songs:", e.message)
    return []
  }
}

export const getPoolParticipantsWithProfiles = async (
  poolId: string,
  providedSupabase?: TypedSupabaseClient,
): Promise<PoolParticipantWithProfile[]> => {
  const supabaseAdmin = createSupabaseAdminClient() // Use admin client for this admin-specific function
  console.log(`[getPoolParticipantsWithProfiles] Fetching participants for poolId: ${poolId}`) // Added log

  if (!isUUID(poolId)) {
    console.error("[getPoolParticipantsWithProfiles] Invalid poolId:", poolId)
    return []
  }

  // Determine next upcoming and last played show IDs
  const { data: nextShow } = await supabaseAdmin
    .from("shows")
    .select("id")
    .eq("pool_id", poolId)
    .eq("is_active", true)
    .in("status", ["UPCOMING", "PICKS_LOCKED"])
    .order("show_date", { ascending: true })
    .limit(1)
    .single()

  const { data: lastShow } = await supabaseAdmin
    .from("shows")
    .select("id")
    .eq("pool_id", poolId)
    .eq("is_active", true)
    .eq("status", "PLAYED")
    .order("show_date", { ascending: false })
    .limit(1)
    .single()

  const nextShowId = nextShow?.id as string | undefined
  const lastShowId = lastShow?.id as string | undefined

  const { data: participantsData, error } = await supabaseAdmin
    .from("pool_participants")
    .select(
      `id,
      user_id,
      joined_at,
      status,
      current_streak,
      profiles ( nickname )`
    )
    .eq("pool_id", poolId)

  if (error) {
    console.error(`[getPoolParticipantsWithProfiles] Supabase error fetching participants for pool ${poolId}:`, error.message)
    return []
  }

  if (!participantsData) return []

  const enriched = await Promise.all(
    participantsData.map(async (p: any) => {
      let upcomingPickTitle: string | undefined
      let lastPickTitle: string | undefined
      let lastPickResult: "WIN" | "LOSE" | "PENDING" | undefined

      if (nextShowId) {
        const { data: upPick } = await supabaseAdmin
          .from("picks")
          .select("result, songs (title)")
          .eq("pool_participant_id", p.id)
          .eq("show_id", nextShowId)
          .single()
        if (upPick) upcomingPickTitle = (upPick as any).songs?.title || undefined
      }

      if (lastShowId) {
        const { data: lastPick } = await supabaseAdmin
          .from("picks")
          .select("result, songs (title)")
          .eq("pool_participant_id", p.id)
          .eq("show_id", lastShowId)
          .single()
        if (lastPick) {
          lastPickTitle = (lastPick as any).songs?.title || undefined
          lastPickResult = lastPick.result as any
        }
      }

      // fetch email and full name from auth.users
      const { data: userRow } = await supabaseAdmin
        .from("auth.users")
        .select("email, raw_user_meta_data")
        .eq("id", p.user_id)
        .single()

      const email = (userRow as any)?.email || undefined
      const fullName = (userRow as any)?.raw_user_meta_data?.full_name || undefined

      return {
        participantId: p.id,
        userId: p.user_id,
        nickname: p.profiles?.nickname || "Unknown",
        fullName,
        email,
        joinedAt: p.joined_at,
        status: p.status as "ALIVE" | "OUT",
        currentStreak: p.current_streak || 0,
        upcomingPickTitle,
        lastPickTitle,
        lastPickResult: lastPickResult as any,
      }
    })
  )

  return enriched as PoolParticipantWithProfile[]
}