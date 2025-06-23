"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Users, Loader2 } from "lucide-react"
import { joinPoolAction } from "@/lib/actions"

interface JoinPoolButtonProps {
  poolId: string
  poolName: string
}

export function JoinPoolButton({ poolId, poolName }: JoinPoolButtonProps) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleJoinPool = () => {
    startTransition(async () => {
      setError(null)
      try {
        const result = await joinPoolAction(poolId)
        if (result.success) {
          router.push(`/dashboard?poolId=${poolId}`)
        } else {
          setError(result.message)
        }
      } catch (err) {
        setError("An unexpected error occurred")
      }
    })
  }

  return (
    <div className="w-full space-y-2">
      <Button 
        onClick={handleJoinPool} 
        disabled={isPending}
        className="w-full"
      >
        {isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Joining Pool...
          </>
        ) : (
          <>
            <Users className="mr-2 h-4 w-4" />
            Join "{poolName}"
          </>
        )}
      </Button>
      {error && (
        <p className="text-sm text-red-600 text-center">{error}</p>
      )}
    </div>
  )
} 