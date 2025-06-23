"use client"

import { useEffect } from "react"
import { useFormState, useFormStatus } from "react-dom"
import { loginUser, type LoginFormState } from "@/lib/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useRouter, useSearchParams } from "next/navigation"

const initialState: LoginFormState = {
  message: "",
  success: false,
  poolId: undefined,
}

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? "Signing In..." : "Sign In"}
    </Button>
  )
}

export function LoginForm() {
  const [state, formAction] = useFormState(loginUser, initialState)
  const router = useRouter()
  const searchParams = useSearchParams()
  const poolIdFromUrl = searchParams.get("poolId")

  useEffect(() => {
    if (state.success) {
      const redirectTo = state.poolId ? `/dashboard?poolId=${state.poolId}` : "/"
      console.log("[LoginForm] Login success. poolId from action state:", state.poolId)
      console.log("[LoginForm] Redirecting to:", redirectTo)
      router.refresh()
      const timer = setTimeout(() => {
        router.push(redirectTo)
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [state.success, state.poolId, router])

  return (
    <Card className="w-full max-w-md card-gradient">
      <CardHeader>
        <CardTitle>Welcome Back!</CardTitle>
        <CardDescription>Sign in to your account to view your dashboard.</CardDescription>
      </CardHeader>
      <form action={formAction}>
        {poolIdFromUrl && <input type="hidden" name="poolId" value={poolIdFromUrl} />}
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" placeholder="fan@phish.com" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" name="password" type="password" required />
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
