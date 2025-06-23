import { Loader2 } from "lucide-react"

export default function LoadingPickPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)]">
      <Loader2 className="h-12 w-12 animate-spin text-primary" />
      <p className="ml-4 text-lg mt-4">Loading Pick Page...</p>
    </div>
  )
}
