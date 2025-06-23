"use client"

import Link from "next/link"
import { useSearchParams } from "next/navigation"
import type React from "react"

interface AuthLinkProps {
  to: "login" | "signup"
  children: React.ReactNode
  className?: string
}

export function AuthLink({ to, children, className }: AuthLinkProps) {
  const searchParams = useSearchParams()
  const poolId = searchParams.get("poolId")

  const baseHref = to === "login" ? "/login" : "/signup"
  const finalHref = poolId ? `${baseHref}?poolId=${poolId}` : baseHref

  return (
    <Link href={finalHref} className={className}>
      {children}
    </Link>
  )
}
