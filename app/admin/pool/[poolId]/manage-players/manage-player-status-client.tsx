"use client"

import { useState } from "react"
import type { PoolParticipantWithProfile } from "@/types"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"
import { Loader2, Save } from "lucide-react"

function SubmitStatusButton({ loading }: { loading: boolean }) {
  return (
    <Button type="submit" size="sm" disabled={loading}>
      {loading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
        </>
      ) : (
        <>
          <Save className="mr-2 h-4 w-4" /> Update
        </>
      )}
    </Button>
  )
}

interface ManagePlayerStatusClientProps {
  participant: PoolParticipantWithProfile
  poolId: string
}

export function ManagePlayerStatusClient({ participant, poolId }: ManagePlayerStatusClientProps) {
  const { toast } = useToast()
  const [currentStatus, setCurrentStatus] = useState<"ALIVE" | "OUT">(participant.status)
  const [loading, setLoading] = useState(false)

  const handleFormSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    setLoading(true)

    const res = await fetch("/admin/update-participant-status", {
      method: "POST",
      body: formData,
    })

    let result: { success: boolean; message: string; updatedParticipant?: { status: string } }

    try {
      result = await res.json()
    } catch {
      result = { success: false, message: "Unexpected server response" }
    }

    toast({
      title: result.success ? "Success" : "Error",
      description: result.message,
      variant: result.success ? "default" : "destructive",
    })
    if (result.success && result.updatedParticipant) {
      setCurrentStatus(result.updatedParticipant.status as "ALIVE" | "OUT")
    }
    setLoading(false)
  }

  return (
    <form onSubmit={handleFormSubmit} className="flex items-center gap-2 justify-end">
      <input type="hidden" name="poolParticipantId" value={participant.participantId} />
      <input type="hidden" name="poolId" value={poolId} />
      <Select
        name="newStatus"
        value={currentStatus}
        onValueChange={(value) => setCurrentStatus(value as "ALIVE" | "OUT")}
      >
        <SelectTrigger className="w-[120px] h-9">
          <SelectValue placeholder="Set status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALIVE">ALIVE</SelectItem>
          <SelectItem value="OUT">OUT</SelectItem>
        </SelectContent>
      </Select>
      <SubmitStatusButton loading={loading} />
    </form>
  )
}
