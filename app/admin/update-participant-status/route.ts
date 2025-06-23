import { NextResponse } from "next/server"
import { updateParticipantStatusAction } from "@/lib/actions"

export async function POST(req: Request) {
  const formData = await req.formData()
  const result = await updateParticipantStatusAction({ message: "", success: false }, formData)

  if (!result.success) {
    return NextResponse.json({ success: false, message: result.message }, { status: 400 })
  }

  // Return JSON so client-side JS can parse without redirect
  return NextResponse.json({ success: true, message: result.message, updatedParticipant: result.updatedParticipant })
} 