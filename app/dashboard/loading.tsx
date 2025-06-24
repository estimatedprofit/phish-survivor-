import { Skeleton } from "@/components/ui/skeleton"

export default function LoadingDashboard() {
  return (
    <div className="space-y-8 max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
      {/* Header skel */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-8 w-24" />
      </div>

      {/* Stats cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>

      {/* Upcoming shows */}
      <Skeleton className="h-6 w-40" />
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-40 w-full" />
        ))}
      </div>

      {/* Leaderboard */}
      <Skeleton className="h-6 w-40 mt-8" />
      <Skeleton className="h-64 w-full" />
    </div>
  )
} 