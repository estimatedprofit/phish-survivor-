import { createServerClient, type CookieOptions } from "@supabase/ssr"
import { cookies } from "next/headers"
import type { SupabaseClient } from "@supabase/supabase-js"

export type TypedSupabaseClient = SupabaseClient

// The default behavior disables cookie "set"/"remove" operations to avoid warnings when the helper is used
// inside React Server Components (where mutating cookies is not allowed).  When calling this helper from a
// context that DOES allow cookie mutation – namely Server Actions or Route Handlers – pass
// `allowCookieWrite = true` so that Supabase can manage the auth cookies and persist the session.

export async function createSupabaseServerClient(allowCookieWrite: boolean = false): Promise<TypedSupabaseClient> {
  const cookieStore = await cookies()

  const cookieMethods = {
    get(name: string) {
      return cookieStore.get(name)?.value
    },
    set(name: string, value: string, options: CookieOptions) {
      if (allowCookieWrite && typeof (cookieStore as any).set === "function") {
        ;(cookieStore as any).set(name, value, options)
      }
    },
    remove(name: string, options: CookieOptions) {
      if (allowCookieWrite && typeof (cookieStore as any).delete === "function") {
        ;(cookieStore as any).delete(name, options)
      }
    },
  }

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: cookieMethods,
    },
  )
}

export function createSupabaseAdminClient(): TypedSupabaseClient {
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    cookies: {
      get: () => undefined,
      set: () => {},
      remove: () => {},
    },
  })
}
