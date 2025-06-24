"use server"
import { revalidatePath } from "next/cache"
import { createSupabaseServerClient, createSupabaseAdminClient } from "@/lib/supabase/server"
import { getAllSongs } from "@/lib/data"
import { redirect } from "next/navigation"
import { normalizeTitle } from "@/lib/utils"

export interface SignupFormState {
  message: string
  success: boolean
  poolId?: string
}

export interface PickSongFormState {
  message: string
  success: boolean
  pick?: { showId: string; songId: string; songTitle: string; poolId: string }
}

export interface CreatePoolFormState {
  message: string
  success: boolean
  poolId?: string
  poolVisibility?: "public" | "private"
}

export interface AdminActionState {
  // This might already exist, ensure it matches or add if not
  message: string
  success: boolean
  updatedParticipant?: { id: string; status: string } // Add this for returning updated status
}

export interface LoginFormState {
  message: string
  success: boolean
  poolId?: string
}

export interface ProcessShowResultsFormState {
  message: string
  success: boolean
  processedShowId?: string
  processedPoolId?: string
}

export async function signupUser(prevState: SignupFormState, formData: FormData): Promise<SignupFormState> {
  // Allow cookie writes so the auth session persists after the Server Action
  const supabase = await createSupabaseServerClient(true)

  const email = formData.get("email") as string
  const password = formData.get("password") as string
  const confirmPassword = formData.get("confirmPassword") as string
  const nickname = formData.get("nickname") as string
  const poolId = formData.get("poolId") as string | null

  if (!email || !password || !nickname) {
    return { message: "Email, password, and nickname are required.", success: false }
  }
  if (password !== confirmPassword) {
    return { message: "Passwords do not match.", success: false }
  }

  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/auth/callback`,
      data: {
        nickname,
        role: "user",
      },
    },
  })

  if (signUpError) {
    console.error("Signup Error Details:", {
      message: signUpError.message,
      code: signUpError.status,
      details: signUpError,
    })

    // Detect duplicate nickname (unique constraint violation on profiles.nickname)
    const duplicateNick = /duplicate key value violates unique constraint .*profiles_nickname_key/i.test(
      signUpError.message,
    )
    if (duplicateNick) {
      return { message: "Nickname already taken. Please choose another.", success: false }
    }

    // Some deployments return a generic "Database error saving new user" instead of the raw PG error.
    // When that happens, we perform a quick check to see if the nickname already exists and return
    // a clearer message.
    if (signUpError.message?.toLowerCase().includes("database error saving new user")) {
      const { data: existingNick } = await supabase
        .from("profiles")
        .select("id")
        .eq("nickname", nickname)
        .maybeSingle()

      if (existingNick) {
        return { message: "Nickname already taken. Please choose another.", success: false }
      }
    }

    // Detect existing email error (Supabase returns 400 with this message)
    if (signUpError.message?.toLowerCase().includes("user already registered")) {
      return { message: "Email already registered. Try logging in instead.", success: false }
    }

    return { message: `Could not authenticate user: ${signUpError.message}`, success: false }
  }

  // If the project still has email confirmations enabled, signUp will return no session.
  // In that case we immediately perform a sign-in so the user can proceed without
  // waiting for the verification email.
  if (!signUpData.session) {
    console.log("No session from signUp, attempting auto-signin...")
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
    if (signInError) {
      console.error("Auto-login after signup failed:", {
        message: signInError.message,
        code: signInError.status,
        details: signInError
      })
      return { message: `Signup succeeded but auto-login failed: ${signInError.message}`, success: false }
    } else {
      console.log("Auto-signin successful")
    }
  } else {
    console.log("Session created from signUp directly")
  }

  const newUserId = signUpData.user?.id || signUpData.session?.user.id

  if (poolId && newUserId) {
    console.log(`New user ${newUserId} attempting to auto-join pool ${poolId}`)
    const { error: participantError } = await supabase
      .from("pool_participants")
      .insert({ user_id: newUserId, pool_id: poolId, status: "ALIVE", current_streak: 0 })

    if (participantError) {
      console.error(
        `User ${newUserId} signed up but failed to auto-join pool ${poolId}:`,
        participantError.message,
      )
    } else {
      console.log(`Successfully auto-joined user ${newUserId} to pool ${poolId}`)
    }
  }

  revalidatePath("/", "layout")
  return {
    message: "Signup successful! Redirecting to your dashboard...",
    success: true,
    poolId: poolId || undefined,
  }
}

export async function submitPick(prevState: PickSongFormState, formData: FormData): Promise<PickSongFormState> {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { message: "You must be logged in to make a pick.", success: false }
  }

  const songId = formData.get("songId") as string | null
  const songTitle = formData.get("songTitle") as string | null
  const showId = formData.get("showId") as string | null
  const poolId = formData.get("poolId") as string | null

  if (!songId || !songTitle || !showId || !poolId) {
    return { message: "Missing required information: Song, Show, or Pool ID.", success: false }
  }

  // Ensure the show is still open for picks
  const { data: showData } = await supabase
    .from("shows")
    .select("status")
    .eq("id", showId)
    .single()

  if (showData && showData.status !== "UPCOMING") {
    return { message: "Picks are closed for this show.", success: false }
  }

  // If a pick already exists and has been scored, prevent changes
  const { data: existingPick } = await supabase
    .from("picks")
    .select("result")
    .eq("pool_participant_id", poolId)
    .eq("show_id", showId)
    .single()

  if (existingPick && existingPick.result && existingPick.result !== "PENDING") {
    return { message: "You cannot change a pick after the show has been scored.", success: false }
  }

  try {
    let poolParticipantId: string

    const { data: existingParticipant, error: participantError } = await supabase
      .from("pool_participants")
      .select("id")
      .eq("user_id", user.id)
      .eq("pool_id", poolId)
      .single()

    if (participantError && participantError.code !== "PGRST116") {
      console.error("Error fetching pool participant:", participantError.message)
      return { message: `Error checking participation: ${participantError.message}`, success: false }
    }

    if (existingParticipant) {
      poolParticipantId = existingParticipant.id
    } else {
      const { data: newParticipant, error: newParticipantError } = await supabase
        .from("pool_participants")
        .insert({
          user_id: user.id,
          pool_id: poolId,
          status: "ALIVE",
          current_streak: 0,
        })
        .select("id")
        .single()

      if (newParticipantError || !newParticipant) {
        console.error("Error creating new pool participant:", newParticipantError?.message)
        return { message: `Error joining pool: ${newParticipantError?.message || "Unknown error"}`, success: false }
      }
      poolParticipantId = newParticipant.id
      console.log(`User ${user.id} auto-joined pool ${poolId} with participant ID ${poolParticipantId}`)
    }

    const { error: pickError } = await supabase.from("picks").upsert(
      {
        pool_participant_id: poolParticipantId,
        show_id: showId,
        song_id: songId,
        picked_at: new Date().toISOString(),
        result: "PENDING",
      },
      {
        onConflict: "pool_participant_id, show_id",
      },
    )

    if (pickError) {
      console.error("Error saving pick:", pickError.message)
      return { message: `Failed to save pick: ${pickError.message}`, success: false }
    }

    revalidatePath(`/pick/${showId}`)
    revalidatePath(`/dashboard?poolId=${poolId}`)

    return {
      message: `Pick locked: "${songTitle}" for show ${showId}!`,
      success: true,
      pick: { showId, songId, songTitle, poolId },
    }
  } catch (e: any) {
    console.error("Unexpected error in submitPick:", e.message)
    return { message: `An unexpected error occurred: ${e.message}`, success: false }
  }
}

export async function createPool(prevState: CreatePoolFormState, formData: FormData): Promise<CreatePoolFormState> {
  console.log("Admin: Attempting to create pool...")
  const supabase = await createSupabaseServerClient() // Use regular client for auth check
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { message: "Unauthorized: User not found.", success: false }
  }
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()

  if (!profile || profile.role !== "admin") {
    return { message: "Unauthorized: Only admins can create pools.", success: false }
  }

  // Use Admin client for actual pool creation
  const supabaseAdmin = createSupabaseAdminClient()

  const name = formData.get("name") as string
  const description = formData.get("description") as string | undefined
  const tourName = formData.get("tourName") as string
  const signupDeadlineStr = formData.get("signupDeadline") as string
  const maxPlayersStr = formData.get("maxPlayers") as string | undefined
  const visibility = formData.get("visibility") as "public" | "private"
  const pickLockOffsetHoursStr = formData.get("pickLockOffsetHours") as string
  const pickLockOffsetMinutesStr = formData.get("pickLockOffsetMinutes") as string
  const isTestPoolFlag = formData.get("isTestPool") === "on"

  if (!name || !tourName || !signupDeadlineStr || !visibility) {
    return { message: "Pool Name, Tour Name, Signup Deadline, and Visibility are required.", success: false }
  }
  if (visibility !== "public" && visibility !== "private") {
    return { message: "Invalid visibility value.", success: false }
  }

  let signupDeadline: string
  try {
    signupDeadline = new Date(signupDeadlineStr).toISOString()
    if (isNaN(new Date(signupDeadline).getTime())) throw new Error("Invalid date")
  } catch (error) {
    return { message: "Invalid Signup Deadline date format. Please use YYYY-MM-DDTHH:mm.", success: false }
  }

  const maxPlayers = maxPlayersStr ? Number.parseInt(maxPlayersStr, 10) : undefined
  if (maxPlayersStr && (isNaN(maxPlayers!) || maxPlayers! <= 0)) {
    return { message: "Invalid Max Players value. Must be a positive number.", success: false }
  }

  const pickLockOffsetHours = pickLockOffsetHoursStr ? Number.parseInt(pickLockOffsetHoursStr, 10) : 0
  const pickLockOffsetMinutes = pickLockOffsetMinutesStr ? Number.parseInt(pickLockOffsetMinutesStr, 10) : 0

  if (
    isNaN(pickLockOffsetHours) ||
    pickLockOffsetHours < 0 ||
    isNaN(pickLockOffsetMinutes) ||
    pickLockOffsetMinutes < 0 ||
    pickLockOffsetMinutes >= 60
  ) {
    return {
      message: "Invalid Pick Lock Offset. Hours and Minutes must be non-negative, and minutes less than 60.",
      success: false,
    }
  }

  const newPoolData = {
    name,
    description,
    tour_name: tourName,
    signup_deadline: signupDeadline,
    status: "SIGNUPS_OPEN",
    max_players: maxPlayers,
    visibility,
    pick_lock_offset_hours: pickLockOffsetHours || null, // Use null for DB if 0 or undefined
    pick_lock_offset_minutes: pickLockOffsetMinutes || null, // Use null for DB if 0 or undefined
    created_by: user.id,
    is_test_pool: isTestPoolFlag,
  }

  const { data: createdPool, error } = await supabaseAdmin.from("pools").insert(newPoolData).select().single()

  if (error || !createdPool) {
    console.error("Admin: Error creating pool in Supabase:", error)
    return { message: `Failed to create pool: ${error?.message || "Unknown error"}`, success: false }
  }

  console.log("Admin: Pool created successfully in Supabase", createdPool)

  // Auto-import upcoming shows for live pools
  if (!createdPool.is_test_pool) {
    try {
      const currentYear = new Date().getFullYear()
      await importShowsForPool(createdPool.id, currentYear)

      // Activate all shows from today forward
      const supabaseAdminActivate = createSupabaseAdminClient()
      const todayIso = new Date().toISOString().slice(0, 10)
      const cutoff = "2025-07-27"
      await supabaseAdminActivate
        .from("shows")
        .update({ is_active: true })
        .eq("pool_id", createdPool.id)
        .gte("show_date", todayIso)
        .lte("show_date", cutoff)
    } catch (e) {
      console.error("Auto-import/activate after pool creation failed:", (e as Error).message)
    }
  }

  if (createdPool.visibility === "public") revalidatePath("/")
  revalidatePath("/admin/create-pool")
  revalidatePath("/admin")
  revalidatePath("/admin?view=archived", "page")

  return {
    message: `Pool "${createdPool.name}" (${createdPool.visibility}) created successfully! ${
      createdPool.visibility === "private" ? `Shareable ID: ${createdPool.id}` : ""
    }`,
    success: true,
    poolId: createdPool.id,
    poolVisibility: createdPool.visibility as "public" | "private",
  }
}

export async function endPoolAction(poolId: string): Promise<AdminActionState> {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { message: "Unauthorized: User not found.", success: false }
  }
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
  if (!profile || profile.role !== "admin") {
    return { message: "Unauthorized: Only admins can end pools.", success: false }
  }

  const supabaseAdmin = createSupabaseAdminClient()
  console.log(`Admin: Attempting to end pool ${poolId}`)

  const { data: updatedPool, error } = await supabaseAdmin
    .from("pools")
    .update({ status: "COMPLETED" })
    .eq("id", poolId)
    .select()
    .single()

  if (error || !updatedPool) {
    console.error(`Admin: Error ending pool ${poolId}:`, error)
    return { message: `Failed to end pool: ${error?.message || "Pool not found or error occurred."}`, success: false }
  }

  console.log(`Admin: Pool ${poolId} status changed to COMPLETED.`)
  revalidatePath("/")
  revalidatePath("/admin")
  revalidatePath(`/dashboard?poolId=${poolId}`)
  revalidatePath("/admin?view=archived", "page")

  return { message: `Pool "${updatedPool.name}" has been ended.`, success: true }
}

export async function archivePoolAction(poolId: string): Promise<AdminActionState> {
  console.log("Admin: Attempting to archive pool", poolId)

  const supabase = await createSupabaseServerClient(true) // Need cookie write to refresh pages via revalidate

  // Auth check
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { message: "Unauthorized: User not found.", success: false }
  }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()

  if (!profile || profile.role !== "admin") {
    return { message: "Unauthorized: Only admins can archive pools.", success: false }
  }

  const { data: updatedPool, error } = await supabase
    .from("pools")
    .update({ visibility: "archived" })
    .eq("id", poolId)
    .select("name")
    .single()

  if (error || !updatedPool) {
    console.error(`Admin: Error archiving pool ${poolId}:`, error)
    return { message: `Failed to archive pool: ${error?.message || "Pool not found or error occurred."}`, success: false }
  }

  console.log(`Admin: Pool ${poolId} visibility changed to archived.`)

  // Revalidate relevant paths so UI updates without full redeploy
  revalidatePath("/admin", "page")
  revalidatePath("/admin?view=archived", "page")
  revalidatePath("/", "layout")

  return { message: `Pool "${updatedPool.name}" has been archived.`, success: true }
}

export async function unarchivePoolAction(poolId: string): Promise<AdminActionState> {
  console.log("Admin: Attempting to unarchive pool", poolId)

  const supabase = await createSupabaseServerClient(true)

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { message: "Unauthorized: User not found.", success: false }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()

  if (!profile || profile.role !== "admin") {
    return { message: "Unauthorized: Only admins can unarchive pools.", success: false }
  }

  const { data: updatedPool, error } = await supabase
    .from("pools")
    .update({ visibility: "public" })
    .eq("id", poolId)
    .select("name")
    .single()

  if (error || !updatedPool) {
    console.error(`Admin: Error unarchiving pool ${poolId}:`, error)
    return { message: `Failed to unarchive pool: ${error?.message || "Pool not found or error occurred."}`, success: false }
  }

  console.log(`Admin: Pool ${poolId} visibility changed to public.`)

  revalidatePath("/admin", "page")
  revalidatePath("/admin?view=archived", "page")
  revalidatePath("/", "layout")

  return { message: `Pool "${updatedPool.name}" has been unarchived and is now public.`, success: true }
}

// -------------------------
// Import shows for a pool
// -------------------------
interface ImportShowsResult {
  success: boolean
  message: string
}

export async function importShowsForPool(poolId: string, year?: number): Promise<ImportShowsResult> {
  // Auth check via regular client
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { success: false, message: "Unauthorized" }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
  if (!profile || profile.role !== "admin") {
    return { success: false, message: "Only admins can import shows" }
  }

  const supabaseAdmin = createSupabaseAdminClient()

  // Pool meta (need test flag)
  const { data: pool } = await supabaseAdmin.from("pools").select("is_test_pool").eq("id", poolId).single()
  if (!pool) return { success: false, message: "Pool not found" }

  // For live pools we use the provided year (or current year). For test pools we lock to 2025 so
  // admins always get the Mexico 2025 run with known setlists.
  const targetYear = pool?.is_test_pool ? 2025 : year ?? new Date().getFullYear()

  try {
    const { getShowsByYear } = await import("@/lib/phishnet/client")
    const { data } = await getShowsByYear(targetYear)

    // Avoid duplicates
    const { data: existing } = await supabaseAdmin
      .from("shows")
      .select("show_date, venue_name")
      .eq("pool_id", poolId)

    const existingSet = new Set<string>((existing || []).map((s: any) => `${s.show_date}-${s.venue_name}`))

    // Sort shows chronologically
    data.sort((a: any, b: any) => new Date(a.showdate).getTime() - new Date(b.showdate).getTime())

    let inserted = 0

    for (const s of data) {
      // Skip non-Phish shows (side projects, sit-ins, etc.) – Phish is artist/band id 1.
      const artistId = (s as any).artistid ?? (s as any).artist_id ?? (s as any).bandid ?? null
      const bandName = ((s as any).band || (s as any).artist || "").toString().toLowerCase()
      if (artistId !== 1 && bandName !== "phish") continue

      const showDateObj = new Date(s.showdate)

      // For test pools we want to let admins play through already-played shows while keeping the pool timeline in the future.
      let poolDateIso = s.showdate // default (live pools)
      let eventDateIso = s.showdate // always the real concert date

      if (pool.is_test_pool) {
        const today = new Date()

        // Only keep shows that have already happened (so setlists exist)
        if (showDateObj >= today) continue

        // And, if the admin passed an explicit year, respect it; otherwise default to targetYear
        if (Number(showDateObj.getUTCFullYear()) !== targetYear) continue

        // For test pools keep the real date for both pool-facing and event dates
        poolDateIso = s.showdate
        eventDateIso = s.showdate
      }

      // For live pools ignore shows strictly before today (but allow shows happening later today).
      if (!pool.is_test_pool) {
        const now = new Date()
        // Normalize to UTC 00:00 of today for comparison
        const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
        if (showDateObj < todayStart) {
          continue
        }
      }

      // Normalize to full ISO YYYY-MM-DD to avoid two-digit year strings that Postgres
      // might interpret in the 1900/2000 range (e.g. "36-09-28" → 2036-09-28).
      poolDateIso = new Date(poolDateIso).toISOString().slice(0, 10)
      eventDateIso = new Date(eventDateIso).toISOString().slice(0, 10)

      const key = `${poolDateIso}-${s.venue}`
      if (existingSet.has(key)) continue

      const row = {
        pool_id: poolId,
        phish_net_show_id: s.showid ?? null,
        show_date: poolDateIso, // date players will see in the pool UI
        event_date: eventDateIso, // real concert date used for setlists
        venue_name: s.venue,
        city_state: `${s.city || ""}${s.state ? ", " + s.state : ""}` || null,
        set_time: s.set_time || null,
        status: "UPCOMING" as const,
        is_active: false,
      }

      const { data: insertedShow, error: insertErr } = await supabaseAdmin.from("shows").insert(row).select("id").single()
      if (!insertErr && insertedShow) {
        inserted++

        try {
          const { getShow, getSetlistByDate } = await import("@/lib/phishnet/client")
          let raw = ""
          if (s.showid) {
            try {
              const { data } = await getShow(String(s.showid))
              raw = (data as any)?.setlistdata || ""
            } catch {}
          }
          if (!raw) {
            try {
              const { data } = await getSetlistByDate(s.showdate)
              raw = Array.isArray(data) ? (data[0] as any)?.setlistdata || "" : ""
            } catch {}
          }
          if (!raw) {
            try {
              const { scrapeSetlistHtml } = await import("@/lib/phishnet/client")
              raw = await scrapeSetlistHtml(s.showdate)
            } catch {}
          }

          if (raw) {
            const allSongs = await getAllSongs(supabaseAdmin as any)
            const titleToId = new Map(allSongs.map((song) => [normalizeTitle(song.title), song.id]))
            const titles = raw
              .split(/[>,]/)
              .map((t) => t.trim())
              .filter(Boolean)
              .map((t) =>
                t
                  .replace(/^(Set\s*\d+:?\s*)/i, "")
                  .replace(/^(Set\s*[I|II|III]+:?\s*)/i, "")
                  .replace(/^(Encore:?\s*)/i, "")
                  .trim(),
              )
            const songIds = titles
              .map((t) => titleToId.get(normalizeTitle(t)))
              .filter(Boolean) as string[]

            if (songIds.length) {
              await supabaseAdmin.from("shows").update({ setlist: songIds }).eq("id", insertedShow.id)
            }
          }
        } catch {
          // Fail silently – importer still succeeds, setlist can be pasted later
        }
      }
    }

    // Revalidate admin pages
    revalidatePath(`/admin/pool/${poolId}`)

    return { success: true, message: `Imported ${inserted} shows${pool.is_test_pool ? " (test dates)" : ""}.` }
  } catch (e: any) {
    return { success: false, message: e.message }
  }
}

export async function loginUser(prevState: LoginFormState, formData: FormData): Promise<LoginFormState> {
  // Allow cookie writes so the user's auth session persists after the Server Action completes
  const supabase = await createSupabaseServerClient(true)

  const email = formData.get("email") as string
  const password = formData.get("password") as string
  const poolId = formData.get("poolId") as string | null

  if (!email || !password) {
    return { message: "Email and password are required.", success: false, poolId: poolId || undefined }
  }

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    console.error("Login Error:", error.message)
    return { message: `Login failed: ${error.message}`, success: false, poolId: poolId || undefined }
  }

  revalidatePath("/", "layout")
  revalidatePath("/dashboard", "page")

  return {
    message: "Login successful! Redirecting...",
    success: true,
    poolId: poolId || undefined,
  }
}

export async function logoutUser() {
  const supabase = await createSupabaseServerClient(true)
  await supabase.auth.signOut()
  revalidatePath("/", "layout")
  revalidatePath("/dashboard", "page")
  redirect("/")
}

export async function processShowResultsAction(
  prevState: ProcessShowResultsFormState,
  formData: FormData,
): Promise<ProcessShowResultsFormState> {
  const supabase = await createSupabaseServerClient() // For auth check
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { message: "Unauthorized: User not found.", success: false }
  }
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
  if (!profile || profile.role !== "admin") {
    return { message: "Unauthorized: Only admins can process results.", success: false }
  }

  // Use Admin client for all subsequent database operations
  const supabaseAdmin = createSupabaseAdminClient()

  const showId = formData.get("showId") as string
  const poolId = formData.get("poolId") as string
  const setlistSongIdsString = formData.get("setlistSongIds") as string

  if (!showId || !poolId || !setlistSongIdsString) {
    return { message: "Missing required data: Show ID, Pool ID, or Setlist.", success: false }
  }

  const setlistSongIds = setlistSongIdsString.split(",").filter((id) => id.trim() !== "")

  if (setlistSongIds.length === 0) {
    return { message: "Setlist cannot be empty. Please select at least one song.", success: false }
  }

  console.log(`[Admin Action] Processing results for Show ID: ${showId}, Pool ID: ${poolId}`)
  console.log(`[Admin Action] Submitted Setlist Song IDs:`, setlistSongIds)

  try {
    const { data: aliveParticipants, error: participantsError } = await supabaseAdmin
      .from("pool_participants")
      .select("id, user_id, status, current_streak")
      .eq("pool_id", poolId)
      .eq("status", "ALIVE")

    if (participantsError) {
      throw new Error(`Error fetching participants: ${participantsError.message}`)
    }

    if (!aliveParticipants || aliveParticipants.length === 0) {
      const { error: updateShowError } = await supabaseAdmin
        .from("shows")
        .update({ status: "PLAYED", setlist: setlistSongIds }) // Store setlist as JSON array of song IDs
        .eq("id", showId)

      if (updateShowError) throw new Error(`Error updating show: ${updateShowError.message}`)

      revalidatePath(`/admin/pool/${poolId}`)
      revalidatePath(`/dashboard?poolId=${poolId}`)
      return {
        message: "No alive participants to process. Show marked as PLAYED.",
        success: true,
        processedShowId: showId,
        processedPoolId: poolId,
      }
    }

    const participantIds = aliveParticipants.map((p) => p.id)

    const { data: picks, error: picksError } = await supabaseAdmin
      .from("picks")
      .select("id, song_id, pool_participant_id")
      .eq("show_id", showId)
      .in("pool_participant_id", participantIds)

    if (picksError) throw new Error(`Error fetching picks: ${picksError.message}`)

    const pickUpdates: Array<{ id: string; result: "WIN" | "LOSE" }> = []
    const participantStatusUpdates: Array<{ id: string; status: "ALIVE" | "OUT"; current_streak: number }> = []
    let winners = 0
    let losers = 0

    for (const participant of aliveParticipants) {
      const participantPick = picks?.find((p) => p.pool_participant_id === participant.id)

      if (!participantPick) {
        losers++
        participantStatusUpdates.push({
          id: participant.id,
          status: "OUT",
          current_streak: 0,
        })
      } else {
        const guessedCorrectly = setlistSongIds.includes(participantPick.song_id)
        pickUpdates.push({
          id: participantPick.id,
          result: guessedCorrectly ? "WIN" : "LOSE",
        })

        if (guessedCorrectly) {
          winners++
          participantStatusUpdates.push({
            id: participant.id,
            status: "ALIVE",
            current_streak: (participant.current_streak || 0) + 1,
          })
        } else {
          losers++
          participantStatusUpdates.push({
            id: participant.id,
            status: "OUT",
            current_streak: 0,
          })
        }
      }
    }

    if (pickUpdates.length > 0) {
      console.log(`[Admin Action] Updating ${pickUpdates.length} picks...`)
      for (const update of pickUpdates) {
        const { error: pickUpdateError } = await supabaseAdmin
          .from("picks")
          .update({ result: update.result })
          .eq("id", update.id)

        if (pickUpdateError) {
          // Throw an error for the specific pick that failed
          throw new Error(`Error updating pick ID ${update.id}: ${pickUpdateError.message}`)
        }
      }
    }

    if (participantStatusUpdates.length > 0) {
      console.log(`[Admin Action] Updating ${participantStatusUpdates.length} participant statuses...`)
      for (const participantUpdate of participantStatusUpdates) {
        const { error: participantUpdateError } = await supabaseAdmin
          .from("pool_participants")
          .update({
            status: participantUpdate.status,
            current_streak: participantUpdate.current_streak,
          })
          .eq("id", participantUpdate.id)

        if (participantUpdateError) {
          throw new Error(`Error updating participant ID ${participantUpdate.id}: ${participantUpdateError.message}`)
        }
      }
    }

    const { error: updateShowError } = await supabaseAdmin
      .from("shows")
      .update({ status: "PLAYED", setlist: setlistSongIds }) // Store setlist as JSON array of song IDs
      .eq("id", showId)

    if (updateShowError) throw new Error(`Error marking show as played: ${updateShowError.message}`)

    revalidatePath(`/admin/pool/${poolId}`)
    revalidatePath(`/admin/process-results/${showId}?poolId=${poolId}`)
    revalidatePath(`/dashboard?poolId=${poolId}`, "layout")

    return {
      message: `Results processed! Winners: ${winners}, Eliminated: ${losers}.`,
      success: true,
      processedShowId: showId,
      processedPoolId: poolId,
    }
  } catch (e: any) {
    console.error("Unexpected error in processShowResultsAction:", e.message)
    return { message: `An unexpected error occurred: ${e.message}`, success: false }
  }
}

// -------------------------
// Toggle show active flag (admin only)
// -------------------------
export async function toggleShowActive(showId: string, makeActive: boolean): Promise<AdminActionState> {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { success: false, message: "Unauthorized: No user" }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
  if (profile?.role !== "admin") return { success: false, message: "Only admins can modify shows" }

  const admin = createSupabaseAdminClient()

  const { data: updated, error } = await admin
    .from("shows")
    .update({ is_active: makeActive })
    .eq("id", showId)
    .select("id, pool_id")
    .single()

  if (error || !updated) return { success: false, message: error?.message || "Show not found" }

  // revalidate pool admin page
  revalidatePath(`/admin/pool/${updated.pool_id}`)

  return { success: true, message: `Show ${makeActive ? "activated" : "deactivated"}.` }
}

// -------------------------
// Update participant status (admin only)
// -------------------------
export async function updateParticipantStatusAction(
  prevState: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { success: false, message: "Unauthorized: No user" }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
  if (profile?.role !== "admin") return { success: false, message: "Only admins can modify participant status" }

  const participantId = formData.get("participantId") as string
  const newStatus = formData.get("status") as "ALIVE" | "OUT"

  if (!participantId || !newStatus) {
    return { success: false, message: "Missing participant ID or status" }
  }

  const admin = createSupabaseAdminClient()

  const { data: updated, error } = await admin
    .from("pool_participants")
    .update({ status: newStatus })
    .eq("id", participantId)
    .select("id, status")
    .single()

  if (error || !updated) return { success: false, message: error?.message || "Failed to update participant" }

  return {
    success: true,
    message: `Participant status updated to ${newStatus}.`,
    updatedParticipant: { id: updated.id, status: updated.status },
  }
}

// -------------------------
// Join Pool Action (for logged-in users)
// -------------------------
export async function joinPoolAction(poolId: string): Promise<AdminActionState> {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { success: false, message: "You must be logged in to join a pool" }

  // Check if pool exists and is open for signups
  const { data: pool, error: poolError } = await supabase
    .from("pools")
    .select("id, name, status, max_players")
    .eq("id", poolId)
    .single()

  if (poolError || !pool) {
    return { success: false, message: "Pool not found" }
  }

  if (pool.status !== "SIGNUPS_OPEN") {
    return { success: false, message: "This pool is no longer accepting new members" }
  }

  // Check if user is already in this pool
  const { data: existingParticipant } = await supabase
    .from("pool_participants")
    .select("id")
    .eq("user_id", user.id)
    .eq("pool_id", poolId)
    .single()

  if (existingParticipant) {
    return { success: false, message: "You're already in this pool!" }
  }

  // Check max players limit
  if (pool.max_players) {
    const { data: currentParticipants } = await supabase
      .from("pool_participants")
      .select("id")
      .eq("pool_id", poolId)

    if (currentParticipants && currentParticipants.length >= pool.max_players) {
      return { success: false, message: "This pool is full" }
    }
  }

  // Join the pool
  const { error: joinError } = await supabase
    .from("pool_participants")
    .insert({
      user_id: user.id,
      pool_id: poolId,
      status: "ALIVE",
      current_streak: 0,
    })

  if (joinError) {
    return { success: false, message: `Failed to join pool: ${joinError.message}` }
  }

  return { success: true, message: `Successfully joined "${pool.name}"!` }
}