export const dynamic = "force-dynamic"

import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Fish, Home, LayoutDashboard, ShieldAlert } from "lucide-react"
import { getCurrentUser } from "@/lib/data"
import { LogoutButton } from "@/components/auth/logout-button"
import { Toaster } from "@/components/ui/toaster"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Phish Survivor Pool",
  description: "Last fan standing wins!",
  generator: "v0.dev",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no",
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const currentUser = await getCurrentUser()
  const isAdmin = currentUser?.role === "admin"

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <div className="min-h-screen flex flex-col">
            <header className="border-b border-border/60 sticky top-0 z-50 bg-background/80 backdrop-blur-lg supports-[backdrop-filter]:bg-background/60">
              <div className="max-w-7xl w-full mx-auto flex h-14 sm:h-16 items-center justify-between px-3 sm:px-4">
                <Link href="/" className="flex items-center gap-2 font-semibold">
                  <Fish className="h-5 w-5 sm:h-6 sm:w-6 text-primary hover-spin" />
                  <span className="text-sm sm:text-base">Phish Survivor</span>
                </Link>
                <nav className="flex items-center gap-1 sm:gap-2">
                  <Button variant="ghost" size="sm" asChild>
                    <Link href="/">
                      <Home className="h-4 w-4" /> <span className="hidden sm:inline sm:ml-2">Home</span>
                    </Link>
                  </Button>
                  {currentUser && (
                    <Button variant="ghost" size="sm" asChild>
                      <Link href="/dashboard">
                        <LayoutDashboard className="h-4 w-4" />
                        <span className="hidden sm:inline sm:ml-2">My Dashboard</span>
                      </Link>
                    </Button>
                  )}
                  {isAdmin && (
                    <Button variant="link" size="sm" asChild>
                      <Link href="/admin" className="text-orange-500 hover:text-orange-600 flex items-center">
                        <ShieldAlert className="h-4 w-4" />
                        <span className="hidden sm:inline">Admin Panel</span>
                        <span className="sm:hidden">Admin</span>
                      </Link>
                    </Button>
                  )}
                  {currentUser ? (
                    <LogoutButton />
                  ) : (
                    <>
                      <Button variant="ghost" size="sm" asChild>
                        <Link href="/login">Login</Link>
                      </Button>
                      <Button size="sm" asChild>
                        <Link href="/signup">Sign Up</Link>
                      </Button>
                    </>
                  )}
                </nav>
              </div>
            </header>
            <main className="flex-grow max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-10">{children}</main>
            <Toaster />
            <footer className="border-t py-6 text-center text-sm text-muted-foreground">
              Will you survive? Maybe so, maybe not.
            </footer>
          </div>
        </ThemeProvider>
      </body>
    </html>
  )
}
