"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { createSupabaseBrowserClient } from "@/lib/supabase/client"

export default function AuthCallback() {
  const router = useRouter()

  useEffect(() => {
    const supabase = createSupabaseBrowserClient()
    // Exchange code param for session
    supabase.auth
      .exchangeCodeForSession(window.location.href)
      .then(() => router.replace("/dashboard"))
      .catch(() => router.replace("/login"))
  }, [router])

  return <p className="text-center mt-32">Signing you in…</p>
} 