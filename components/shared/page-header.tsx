import type React from "react"

interface PageHeaderProps {
  title: string
  description?: string
  children?: React.ReactNode
}

export function PageHeader({ title, description, children }: PageHeaderProps) {
  return (
    <div className="mb-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{title}</h1>
        {children}
      </div>
      {description && <p className="text-sm sm:text-base text-muted-foreground">{description}</p>}
    </div>
  )
}
