import { SignupForm } from "@/components/auth/signup-form"
import { Card, CardContent } from "@/components/ui/card"
import { AuthLink } from "@/components/auth/auth-link"
import { Suspense } from "react" // Added Suspense

export default function SignupPage() {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <Suspense fallback={<div className="w-full max-w-md text-center p-8">Loading signup form...</div>}>
        <SignupForm />
      </Suspense>
      <Card className="w-full max-w-md mt-4 border-none shadow-none">
        <CardContent className="text-center text-sm">
          <p>
            Already have an account?{" "}
            <AuthLink to="login" className="font-semibold text-primary hover:underline">
              Log in here
            </AuthLink>
            .
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
