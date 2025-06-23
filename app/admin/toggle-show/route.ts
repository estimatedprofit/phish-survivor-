import { NextResponse } from "next/server"
import { toggleShowActive } from "@/lib/actions"

export async function POST(req: Request) {
  const form = await req.formData()
  const showId = form.get("showId") as string | null
  const makeActiveStr = form.get("makeActive") as string | null
  const makeActive = makeActiveStr === "true"

  if (!showId) {
    return NextResponse.json({ success: false, message: "Missing showId" }, { status: 400 })
  }
  const res = await toggleShowActive(showId, makeActive)
  if (!res.success) {
    return NextResponse.json({ success: false, message: res.message }, { status: 400 })
  }
  return NextResponse.redirect(req.headers.get("referer") || "/admin")
} 