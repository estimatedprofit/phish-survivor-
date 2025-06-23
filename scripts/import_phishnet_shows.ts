#!/usr/bin/env ts-node

/**
 * Import Phish shows for a given year and attach them to a pool.
 * Run with:
 *   pnpm dlx ts-node scripts/import_phishnet_shows.ts <YEAR> <POOL_ID>
 *
 * Example:
 *   pnpm dlx ts-node scripts/import_phishnet_shows.ts 2025 ee60fddd-d532-405b-944b-2d12cefe8acd
 */

import "dotenv/config"
import { getShowsByYear } from "@/lib/phishnet/client"
import { createSupabaseAdminClient } from "@/lib/supabase/server"
import { parseISO } from "date-fns"

async function main() {
  const [yearArg, poolId] = process.argv.slice(2)
  if (!yearArg || !poolId) {
    console.error("Usage: ts-node import_phishnet_shows.ts <YEAR> <POOL_ID>")
    process.exit(1)
  }

  const year = Number(yearArg)
  if (Number.isNaN(year) || year < 1990) {
    console.error("Invalid year:", yearArg)
    process.exit(1)
  }

  console.log(`Fetching shows for year ${year} from Phish.net …`)
  const { data } = await getShowsByYear(year)
  console.log(`Received ${data.length} shows. Processing …`)

  const supabase = createSupabaseAdminClient()

  // Fetch existing shows for pool to avoid duplicates
  const { data: existing } = await supabase
    .from("shows")
    .select("show_date, venue_name")
    .eq("pool_id", poolId)

  const existingSet = new Set<string>(
    existing?.map((s: any) => `${s.show_date}-${s.venue_name}`) || [],
  )

  let inserted = 0
  for (const s of data) {
    const key = `${s.showdate}-${s.venue}`
    if (existingSet.has(key)) continue // already in DB

    // Basic parse of API fields; adjust property names if API differs
    const row = {
      pool_id: poolId,
      phish_net_show_id: s.showid ?? null,
      show_date: parseISO(s.showdate),
      venue_name: s.venue,
      city_state: `${s.city || ""}${s.state ? ", " + s.state : ""}` || null,
      set_time: s.set_time || null,
      status: "UPCOMING" as const,
    }

    const { error } = await supabase.from("shows").insert(row)
    if (error) {
      console.error("Error inserting show", row.phish_net_show_id, error.message)
    } else {
      inserted++
    }
  }

  console.log(`✅ Imported ${inserted} new shows for pool ${poolId}.`)
}

main().catch((e) => {
  console.error("❌ import script failed:", e)
  process.exit(1)
}) 