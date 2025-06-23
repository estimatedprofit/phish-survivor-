import { LoginForm } from "@/components/auth/login-form"
import { Card, CardContent } from "@/components/ui/card"
import { AuthLink } from "@/components/auth/auth-link"
import { Suspense } from "react"

export default function LoginPage() {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <Suspense fallback={<div className="w-full max-w-md text-center p-8">Loading login form...</div>}>
        <LoginForm />
      </Suspense>
      <Card className="w-full max-w-md mt-4 border-none shadow-none">
        <CardContent className="text-center text-sm">
          <p>
            Don't have an account?{" "}
            <AuthLink to="signup" className="font-semibold text-primary hover:underline">
              Sign up here
            </AuthLink>
            .
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
