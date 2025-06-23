"use client"

import { useActionState } from "react"
import { useFormStatus } from "react-dom"
import { signupUser, type SignupFormState } from "@/lib/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"

const initialState: SignupFormState = {
  message: "",
  success: false,
}

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? "Signing Up..." : "Join Pool"}
    </Button>
  )
}

export function SignupForm() {
  const [state, formAction] = useActionState(signupUser, initialState)
  const router = useRouter()
  const searchParams = useSearchParams()
  const poolId = searchParams.get("poolId")

  useEffect(() => {
    if (state.success) {
      const redirectTo = state.poolId ? `/dashboard?poolId=${state.poolId}` : "/"
      // Refresh to ensure new auth cookies are read, then navigate
      router.refresh()
      router.push(redirectTo)
    }
  }, [state, router])

  return (
    <Card className="w-full max-w-md card-gradient">
      <CardHeader>
        <CardTitle>Join the Survivor Pool</CardTitle>
        <CardDescription>Enter your email and choose a nickname to get started.</CardDescription>
      </CardHeader>
      <form action={formAction}>
        {poolId && <input type="hidden" name="poolId" value={poolId} />}
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" placeholder="fan@phish.com" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="nickname">Nickname</Label>
            <Input id="nickname" name="nickname" type="text" placeholder="Your Nickname" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" name="password" type="password" required minLength={6} />
            <p className="text-xs text-muted-foreground">Password must be at least 6 characters.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <Input id="confirmPassword" name="confirmPassword" type="password" required />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-2">
          <SubmitButton />
          {state.message && (
            <p className={`text-sm ${state.success ? "text-green-600" : "text-red-600"}`}>{state.message}</p>
          )}
        </CardFooter>
      </form>
    </Card>
  )
}
