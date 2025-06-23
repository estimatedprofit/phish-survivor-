"use client"

import { logoutUser } from "@/lib/actions"
import { Button } from "@/components/ui/button"
import { LogOut } from "lucide-react"

export function LogoutButton() {
  return (
    <form action={logoutUser}>
      <Button type="submit" variant="ghost" size="sm">
        <LogOut className="h-4 w-4 sm:mr-2" /> <span className="hidden sm:inline">Logout</span>
      </Button>
    </form>
  )
}
