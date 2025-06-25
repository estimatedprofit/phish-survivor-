// Minimal Phish.net API helper
// Docs: https://docs.phish.net/

const BASE_URL = "https://api.phish.net/v5"

// Cheerio is imported dynamically inside scrapeSetlistHtml to avoid build-time ESM/CJS issues and
// missing type declarations in environments where the library is not installed.

/**
 * Generic request helper that automatically attaches the API key
 * hand normalises basic error handling. All helpers below delegate to it.
 */
async function pnet<T>(endpoint: string, params: Record<string, string | number> = {}): Promise<T> {
  if (!process.env.PHISH_NET_API_KEY) {
    throw new Error("Missing PHISH_NET_API_KEY environment variable. Add it to .env.local or your hosting env.")
  }

  const url = new URL(`${BASE_URL}${endpoint}`)
  url.searchParams.set("apikey", process.env.PHISH_NET_API_KEY)
  url.searchParams.set("format", "json")

  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, String(v))
  }

  // Use Next.js fetch cache so we don't hammer the API on every request
  const res = await fetch(url.toString(), { next: { revalidate: 60 } }) // 60-second server cache

  if (!res.ok) {
    throw new Error(`Phish.net request failed (${endpoint}): ${res.status}`)
  }

  const json: any = await res.json()
  if (json.error) {
    throw new Error(`Phish.net error response: ${json.error}`)
  }
  return json as T
}

/* ------------------------------------------------------------------
   Convenience helpers (extend as needed)
-------------------------------------------------------------------*/

// Full song catalogue
export const getAllSongs = () =>
  pnet<{ data: { id: string; title: string }[] }>("/songs.json")

// Single show with setlist data
export const getShow = (showId: string) =>
  pnet<{ data: { showid: string; showdate: string; setlistdata: string } }>(
    `/shows/${showId}.json`,
  )

// Shows for a given year (example helper)
export const getShowsByYear = (year: number) =>
  pnet<{ data: any[] }>("/shows.json", { year })

// Show by date, returns setlistdata too
export const getSetlistByDate = (showDate: string) =>
  pnet<{ data: { setlistdata?: string }[] }>(`/setlists/showdate/${showDate}.json`)

// ------------------------------------------------------------------
// You can add more helpers (venues, jamcharts, etc.) following the
// same pattern when you need them.
// ------------------------------------------------------------------

/**
 * Fallback: scrape the HTML show page when the JSON API has no setlistdata.
 * Returns the raw setlist string (same format as API's setlistdata) or "".
 */
export async function scrapeSetlistHtml(showDate: string): Promise<string> {
  try {
    // Phish.net supports a convenient "?d=YYYY-MM-DD" query that redirects to the show page
    const htmlRes = await fetch(`https://phish.net/setlists/?d=${showDate}`, {
      // Revalidate daily – HTML is static once posted
      next: { revalidate: 60 * 60 * 24 },
    })
    if (!htmlRes.ok) return ""

    const html = await htmlRes.text()

    // Dynamically import cheerio only in the server runtime.
    // eslint-disable-next-line @typescript-eslint/consistent-type-imports
    // @ts-ignore – cheerio's types are optional and may not be installed in the runtime.
    const { load } = await import("cheerio")
    const $ = load(html)

    // The setlist songs are rendered in a few different ways depending on when the page was published.
    // Older pages wrap each song in <a> or <span> inside .setlist-body.
    // Newer pages wrap them in <li class="setlist-song">.  Grab them all.
    const texts: string[] = []
    $(".setlist-body a, .setlist-body span, .setlist-body li.setlist-song").each((_: unknown, el: any) => {
      const raw = $(el).text().trim()
      if (!raw) return

      // Remove trailing characters like "," or ">" that appear in the markup
      const cleaned = raw.replace(/[>|,]+$/g, "").trim()

      // Skip section labels (e.g., "Set 1:", "Encore:") and empty strings
      if (!cleaned || /^(set\s*\d+|encore)[:]?/i.test(cleaned)) return

      texts.push(cleaned)
    })

    if (!texts.length) return ""

    // Re-create the API's delimiter style:  "Song1 > Song2, Song3"
    return texts.join(" > ")
  } catch {
    return ""
  }
} 