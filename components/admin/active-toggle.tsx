"use client"

import * as React from "react"
import { Switch } from "@/components/ui/switch"

export function ActiveToggle({ showId, isActive }: { showId: string; isActive: boolean }) {
  const [pending, startTransition] = React.useTransition()
  const [checked, setChecked] = React.useState(isActive)

  const handleChange = (value: boolean) => {
    setChecked(value)

    const formData = new FormData()
    formData.append("showId", showId)
    formData.append("makeActive", value.toString())

    startTransition(async () => {
      try {
        await fetch("/admin/toggle-show", {
          method: "POST",
          body: formData,
        })
      } catch (error) {
        // Revert UI if error occurs
        setChecked(!value)
        console.error("Failed to toggle show active status", error)
      }
    })
  }

  return <Switch checked={checked} onCheckedChange={handleChange} disabled={pending} />
} 