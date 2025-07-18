// Serverless Cron Route: /api/cron/process-shows
// Fetches setlists from Phish.net, stores them, and grades picks.

import { NextResponse } from "next/server"
import { createSupabaseAdminClient, createSupabaseServerClient } from "@/lib/supabase/server"
import { getShow, getSetlistByDate } from "@/lib/phishnet/client"
import { processShowResultsInternal } from "@/lib/results"
import { getAllSongs } from "@/lib/data"
import { normalizeTitle } from "@/lib/utils"
import { fromZonedTime } from "date-fns-tz"
import { inferTimezone } from "@/lib/data"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  // ----- auth -----
  const authHeader = request.headers.get("authorization")
  const bearer = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined
  const secret = request.headers.get("x-cron-secret") || bearer || new URL(request.url).searchParams.get("secret")

  if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
    // Fallback: allow logged-in admin users to trigger manually
    try {
      const supabaseServer = await createSupabaseServerClient()
      const {
        data: { user },
      } = await supabaseServer.auth.getUser()

      if (user) {
        const { data: profile } = await supabaseServer.from("profiles").select("role").eq("id", user.id).single()
        if (profile?.role === "admin") {
          // Authorized via admin session
        } else {
          return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
        }
      } else {
        return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
      }
    } catch (e) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
    }
  }

  const supabase = createSupabaseAdminClient()
  const today = new Date().toISOString().split("T")[0]

  const url = new URL(request.url)
  const manualPoolId = url.searchParams.get("poolId")

  let showQuery = supabase
    .from("shows")
    .select("id, pool_id, phish_net_show_id, show_date, event_date, city_state, status, setlist, is_active, pools (is_test_pool)")
    .eq("is_active", true)

  if (!manualPoolId) {
    showQuery = showQuery.lte("show_date", today)
  } else {
    // Manual admin run: include shows regardless of activation flag/date.
    showQuery = supabase
      .from("shows")
      .select("id, pool_id, phish_net_show_id, show_date, event_date, city_state, status, setlist, is_active, pools (is_test_pool)")
      .eq("is_active", true)
      .eq("pool_id", manualPoolId)
      .order("show_date", { ascending: true })
  }

  const { data: shows, error } = await showQuery

  if (error) return NextResponse.json({ success: false, message: error.message }, { status: 500 })
  if (!shows || shows.length === 0) return NextResponse.json({ success: true, message: "No shows to process" })

  const allSongs = await getAllSongs(supabase as any)
  const titleToId = new Map(allSongs.map((s) => [normalizeTitle(s.title), s.id]))

  const results: any[] = []

  const targetShows = manualPoolId ? shows.filter((s: any) => s.pool_id === manualPoolId) : shows

  for (const show of targetShows) {
    if (!manualPoolId && show.pools && (show as any).pools.is_test_pool) {
      // Skip test pools in regular cron runs
      continue
    }
    // If the show already has a setlist saved in DB, use it directly (helpful for test pools)
    if (Array.isArray(show.setlist) && show.setlist.length > 0) {
      const songIds = show.setlist as string[]

      // Determine if we should finalize based on venue local time (+1 day 00:00, or +2h for NYE)
      const tz = inferTimezone(show.city_state || undefined)
      const baseLocalStr = `${show.show_date} 00:00`
      let startUtc: Date
      try {
        startUtc = fromZonedTime(baseLocalStr, tz)
      } catch {
        startUtc = new Date(`${show.show_date}T00:00:00Z`)
      }
      const isNye = show.show_date.endsWith("-12-31")
      const finalizeUtc = new Date(startUtc.getTime() + (isNye ? 26 : 24) * 60 * 60 * 1000)
      const finalize = Date.now() >= finalizeUtc.getTime()
      const r = await processShowResultsInternal({ showId: show.id, poolId: show.pool_id, setlistSongIds: songIds, finalize })
      results.push({ showId: show.id, processed: true, used: "existing-setlist", ...r })
      continue
    }

    try {
      let raw: string | undefined = ""

      // Attempt via show id first if available
      if (show.phish_net_show_id) {
        try {
          const { data } = await getShow(show.phish_net_show_id)
          raw = (data as any)?.setlistdata || ""
        } catch {}
      }

      // Fallback by date regardless of previous attempt outcome
      if (!raw || raw.trim() === "") {
        try {
          const { data: byDate } = await getSetlistByDate(show.event_date || show.show_date)
          let fallbackRaw: string | undefined
          if (Array.isArray(byDate)) {
            fallbackRaw = (byDate[0] as any)?.setlistdata
          } else if (byDate && typeof byDate === "object") {
            fallbackRaw = (byDate as any)?.setlistdata
          }
          raw = fallbackRaw || ""
        } catch {}
      }

      // HTML scrape fallback when API hasn't populated yet OR when it is incomplete
      {
        const { scrapeSetlistHtml } = await import("@/lib/phishnet/client")
        const scraped = await scrapeSetlistHtml(show.event_date || show.show_date)
        if (scraped && scraped.trim()) {
          // Use scraped if API raw is empty OR scraped has more separators (songs) than API raw
          if (!raw || raw.split(/[>,]/).length < scraped.split(/[>,]/).length) {
            raw = scraped
          }
        }
      }

      if (!raw || raw.trim() === "") {
        results.push({ showId: show.id, processed: false, reason: "No setlistdata from Phish.net yet" })
        continue
      }
      const titles = raw
        .split(/[>,]/)
        .map((t) => t.trim())
        .filter(Boolean)

      // NEW: Ensure every title has a matching song ID in the DB. If not, create it.
      const missingTitles: string[] = []
      for (const t of titles) {
        if (!titleToId.has(normalizeTitle(t))) {
          missingTitles.push(t)
        }
      }

      if (missingTitles.length) {
        // Insert any new songs and update the cache map
        const { data: inserted, error: insertErr } = await supabase
          .from("songs")
          .insert(missingTitles.map((title) => ({ title })))
          .select("id, title")

        if (!insertErr && inserted) {
          inserted.forEach((s: any) => {
            titleToId.set(normalizeTitle(s.title), s.id)
          })
        }
      }

      const songIds = titles
        .map((t) => titleToId.get(normalizeTitle(t)))
        .filter(Boolean) as string[]

      if (songIds.length === 0) {
        results.push({ showId: show.id, processed: false, reason: "No titles matched songs table (even after insert)" })
        continue
      }
      // Determine finalize based on venue local time (midnight next day, or 2am if NYE)
      const tz = inferTimezone(show.city_state || undefined)
      const baseLocalStr = `${show.show_date} 00:00`
      let startUtc: Date
      try {
        startUtc = fromZonedTime(baseLocalStr, tz)
      } catch {
        startUtc = new Date(`${show.show_date}T00:00:00Z`)
      }
      const isNye = show.show_date.endsWith("-12-31")
      const finalizeUtc = new Date(startUtc.getTime() + (isNye ? 26 : 24) * 60 * 60 * 1000) // +24h or +26h
      const finalize = Date.now() >= finalizeUtc.getTime()
      const r = await processShowResultsInternal({ showId: show.id, poolId: show.pool_id, setlistSongIds: songIds, finalize })
      results.push({ showId: show.id, processed: true, ...r })
    } catch (e: any) {
      results.push({ showId: show.id, processed: false, reason: e.message })
    }
  }

  return NextResponse.json({ success: true, processed: results })
} 