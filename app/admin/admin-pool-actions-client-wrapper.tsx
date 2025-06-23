"use client"

import { AdminPoolActions } from "@/components/admin/admin-pool-actions"
import { useToast } from "@/components/ui/use-toast"
import type { Pool } from "@/types"

interface AdminPoolActionsClientWrapperProps {
  pool: Pool
}

export function AdminPoolActionsClientWrapper({ pool }: AdminPoolActionsClientWrapperProps) {
  const { toast } = useToast()

  const handleActionComplete = (message: string, success: boolean) => {
    toast({
      title: success ? "Success" : "Error",
      description: message,
      variant: success ? "default" : "destructive",
    })
  }

  return <AdminPoolActions pool={pool} onActionComplete={handleActionComplete} />
}
