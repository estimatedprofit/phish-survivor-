"use client"

import type React from "react"
import Link from "next/link"

import { useState } from "react"
import { useFormStatus } from "react-dom"
import { Button } from "@/components/ui/button"
import { endPoolAction, archivePoolAction, unarchivePoolAction } from "@/lib/actions"
import { Loader2, Users, Trash2, PowerOff, Settings, RotateCw } from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import type { Pool } from "@/types"

interface AdminPoolActionsProps {
  pool: Pool
  onActionComplete: (message: string, success: boolean) => void
}

function EndPoolButton({
  poolId,
  onActionComplete,
}: { poolId: string; onActionComplete: AdminPoolActionsProps["onActionComplete"] }) {
  const { pending } = useFormStatus()
  const [isOpen, setIsOpen] = useState(false)

  const handleEndPool = async () => {
    const result = await endPoolAction(poolId)
    onActionComplete(result.message, result.success)
    setIsOpen(false)
  }

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" size="sm" disabled={pending}>
          <PowerOff className="mr-2 h-4 w-4" />
          End Pool
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you sure you want to end this pool?</AlertDialogTitle>
          <AlertDialogDescription>
            This will mark the pool as "COMPLETED". Players will no longer be able to make picks. This action cannot be
            easily undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleEndPool}
            disabled={pending}
            className="bg-destructive hover:bg-destructive/90"
          >
            {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Yes, End Pool
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export function AdminPoolActions({ pool, onActionComplete }: AdminPoolActionsProps) {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-center gap-2">
      <Button variant="outline" size="sm" asChild>
        <Link href={`/admin/pool/${pool.id}`}>
          <Settings className="mr-2 h-4 w-4" /> Manage
        </Link>
      </Button>
      {pool.status !== "COMPLETED" && <EndPoolButton poolId={pool.id} onActionComplete={onActionComplete} />}
      <Button variant="outline" size="sm" asChild>
        <Link href={`/admin/pool/${pool.id}/manage-players`}>
          <Users className="mr-2 h-4 w-4" /> Players
        </Link>
      </Button>
      {pool.visibility !== "archived" ? (
        <Button
          variant="outline"
          size="sm"
          onClick={async () => {
            const result = await archivePoolAction(pool.id)
            onActionComplete(result.message, result.success)
          }}
        >
          <Trash2 className="mr-2 h-4 w-4" /> Archive
        </Button>
      ) : (
        <Button
          variant="outline"
          size="sm"
          onClick={async () => {
            const result = await unarchivePoolAction(pool.id)
            onActionComplete(result.message, result.success)
          }}
        >
          <RotateCw className="mr-2 h-4 w-4" /> Unarchive
        </Button>
      )}
    </form>
  )
}
