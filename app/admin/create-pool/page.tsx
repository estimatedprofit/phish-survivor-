import { CreatePoolForm } from "@/components/admin/create-pool-form"
import { PageHeader } from "@/components/shared/page-header"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ChevronLeft } from "lucide-react"

export const metadata = {
  title: "Admin: Create Pool",
  robots: {
    index: false,
    follow: false,
  },
}

export default function AdminCreatePoolPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Admin: Create New Pool">
        <Button variant="outline" asChild>
          <Link href="/admin">
            {" "}
            {/* Changed from / to /admin */}
            <ChevronLeft className="mr-2 h-4 w-4" />
            Back to Admin Dashboard
          </Link>
        </Button>
      </PageHeader>
      <div className="flex justify-center">
        <CreatePoolForm />
      </div>
      <div className="text-center text-sm text-muted-foreground mt-8">
        <p>
          <strong>Note:</strong> Pools created here will be added to your Supabase database.
        </p>
      </div>
    </div>
  )
}
