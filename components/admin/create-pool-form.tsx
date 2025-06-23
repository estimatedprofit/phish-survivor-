"use client"

import { useActionState } from "react"
import { useFormStatus } from "react-dom"
import { createPool, type CreatePoolFormState } from "@/lib/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { CheckCircle, Info, LinkIcon, Loader2, Copy, Clock } from "lucide-react"
import { useEffect, useRef, useState } from "react"

const initialState: CreatePoolFormState = {
  message: "",
  success: false,
}

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating Pool...
        </>
      ) : (
        "Create Pool"
      )}
    </Button>
  )
}

export function CreatePoolForm() {
  const [state, formAction] = useActionState(createPool, initialState)
  const formRef = useRef<HTMLFormElement>(null)
  const [shareableLink, setShareableLink] = useState<string | null>(null)
  const [hasCopied, setHasCopied] = useState(false)

  useEffect(() => {
    if (state.success) {
      formRef.current?.reset()
      if (state.poolId && typeof window !== "undefined") {
        // Redirect admin to manage shows page immediately
        window.location.href = `/admin/pool/${state.poolId}`
        return
      }
      if (state.poolVisibility === "private" && state.poolId && typeof window !== "undefined") {
        setShareableLink(`${window.location.origin}/join/${state.poolId}?invited=1`)
      } else {
        setShareableLink(null)
      }
    } else {
      setShareableLink(null)
    }
  }, [state])

  const handleCopyLink = async () => {
    if (!shareableLink) return
    try {
      await navigator.clipboard.writeText(shareableLink)
      setHasCopied(true)
      setTimeout(() => setHasCopied(false), 2000)
    } catch (err) {
      console.error("Failed to copy link:", err)
    }
  }

  const now = new Date()
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset()) // Adjust for local timezone for default value
  now.setDate(now.getDate() + 7) // Default deadline 7 days from now
  const defaultDeadline = now.toISOString().slice(0, 16) // Format for datetime-local input

  return (
    <Card className="w-full max-w-lg">
      <CardHeader>
        <CardTitle>Create New Survivor Pool</CardTitle>
        <CardDescription>Fill in the details for the new pool. Public pools appear on the homepage.</CardDescription>
      </CardHeader>
      <form action={formAction} ref={formRef}>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name">Pool Name</Label>
            <Input id="name" name="name" placeholder="e.g., Summer Tour 2025 Survivor" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              name="description"
              placeholder="e.g., The ultimate test of Phish knowledge for the Summer 2025 tour!"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tourName">Tour Name</Label>
            <Input id="tourName" name="tourName" placeholder="e.g., Summer 2025" required />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="signupDeadline">Signup Deadline</Label>
              <Input
                id="signupDeadline"
                name="signupDeadline"
                type="datetime-local"
                defaultValue={defaultDeadline}
                required
              />
              <p className="text-xs text-muted-foreground">When signups close.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="maxPlayers">Max Players (Optional)</Label>
              <Input id="maxPlayers" name="maxPlayers" type="number" placeholder="e.g., 200" min="1" />
              <p className="text-xs text-muted-foreground">Leave blank for unlimited.</p>
            </div>
          </div>
          <div className="space-y-2 border-t pt-4 mt-4">
            <Label className="flex items-center gap-2">
              <Clock className="h-4 w-4" /> Pick Lock Offset
            </Label>
            <p className="text-xs text-muted-foreground mb-2">
              How long before each show's scheduled start time should picks lock? (Applies to all shows in this pool).
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="pickLockOffsetHours" className="text-sm">
                  Hours
                </Label>
                <Input
                  id="pickLockOffsetHours"
                  name="pickLockOffsetHours"
                  type="number"
                  placeholder="e.g., 1"
                  min="0"
                  defaultValue="1"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="pickLockOffsetMinutes" className="text-sm">
                  Minutes
                </Label>
                <Input
                  id="pickLockOffsetMinutes"
                  name="pickLockOffsetMinutes"
                  type="number"
                  placeholder="e.g., 30"
                  min="0"
                  max="59"
                  defaultValue="0"
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Example: 1 hour 0 minutes means picks lock 1hr before showtime.
            </p>
          </div>
          <div className="space-y-2 border-t pt-4 mt-4">
            <Label>Visibility</Label>
            <RadioGroup name="visibility" defaultValue="public" className="flex gap-4">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="public" id="public" />
                <Label htmlFor="public" className="font-normal">
                  Public (Listed on homepage)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="private" id="private" />
                <Label htmlFor="private" className="font-normal">
                  Private (Invite-only via link)
                </Label>
              </div>
            </RadioGroup>
          </div>
          <div className="space-y-2 border-t pt-4 mt-4">
            <Label htmlFor="isTestPool" className="flex items-center gap-2">
              <input type="checkbox" id="isTestPool" name="isTestPool" className="mr-2" />
              Test mode (manual scoring)
            </Label>
            <p className="text-xs text-muted-foreground">
              In Test mode, shows are back-dated starting 2025-01-01 and auto-scoring is disabled; you'll get a "Run
              Scoring Now" button instead.
            </p>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4 pt-6">
          <SubmitButton />
          {state.message && (
            <Alert
              variant={state.success ? "default" : "destructive"}
              className={state.success ? "bg-green-50 border-green-300 dark:bg-green-900/30 dark:border-green-700" : ""}
            >
              {state.success ? <CheckCircle className="h-4 w-4" /> : <Info className="h-4 w-4" />}
              <AlertTitle>{state.success ? "Success!" : "Notice"}</AlertTitle>
              <AlertDescription>
                {state.message}
                {state.success && state.poolVisibility === "private" && shareableLink && (
                  <div className="mt-2 p-2 border rounded-md bg-background">
                    <Label htmlFor="shareLink" className="font-semibold text-sm">
                      Private Pool Signup Link:
                    </Label>
                    <div className="flex items-center gap-2 mt-1">
                      <LinkIcon className="h-4 w-4 text-muted-foreground" />
                      <Input id="shareLink" readOnly value={shareableLink} className="text-xs flex-grow" />
                      <Button type="button" size="sm" variant="outline" onClick={handleCopyLink}>
                        {hasCopied ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        <span className="sr-only">{hasCopied ? "Copied" : "Copy"}</span>
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Share this link with users to invite them.</p>
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}
        </CardFooter>
      </form>
    </Card>
  )
}
