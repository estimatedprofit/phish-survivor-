export const dynamic = "force-dynamic"

import type React from "react"
import { getCurrentUser } from "@/lib/data"
import { redirect } from "next/navigation"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { ShieldAlert } from "lucide-react"

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser()

  if (user?.role !== "admin") {
    console.log("[AdminLayout] User is not admin, redirecting to /")
    redirect("/")
  }

  console.log("[AdminLayout] User is admin, rendering admin content.")
  return (
    <div>
      <Alert
        variant="destructive"
        className="mb-6 bg-yellow-50 border-yellow-300 text-yellow-800 dark:bg-yellow-900/30 dark:border-yellow-700 dark:text-yellow-200"
      >
        <ShieldAlert className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
        <AlertTitle>Admin Area</AlertTitle>
        <AlertDescription>
          You are currently in the admin section. Changes made here can affect all users.
        </AlertDescription>
      </Alert>
      {children}
    </div>
  )
}
