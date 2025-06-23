import type { User } from "@/types"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { CheckCircle, XCircle } from "lucide-react"

interface UserStatusBannerProps {
  user: User
}

export function UserStatusBanner({ user }: UserStatusBannerProps) {
  if (!user) return null

  const isAlive = user.status === "ALIVE"

  return (
    <Alert
      variant={isAlive ? "default" : "destructive"}
      className={`mb-6 ${isAlive ? "bg-green-50 border-green-300 dark:bg-green-900/30 dark:border-green-700" : "bg-red-50 border-red-300 dark:bg-red-900/30 dark:border-red-700"}`}
    >
      {isAlive ? (
        <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
      ) : (
        <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
      )}
      <AlertTitle className={isAlive ? "text-green-700 dark:text-green-300" : "text-red-700 dark:text-red-300"}>
        {isAlive ? `You're ALIVE, ${user.nickname}!` : `You're OUT, ${user.nickname}.`}
      </AlertTitle>
      <AlertDescription className={isAlive ? "text-green-600 dark:text-green-500" : "text-red-600 dark:text-red-500"}>
        {isAlive
          ? "Keep those picks coming! Check upcoming shows to make your next selection."
          : "Better luck next tour! You can still follow the pool's progress."}
      </AlertDescription>
    </Alert>
  )
}
