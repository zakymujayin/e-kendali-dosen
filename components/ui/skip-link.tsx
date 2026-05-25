"use client"

import { cn } from "@/lib/utils"

export function SkipLink() {
  return (
    <a
      href="#main-content"
      className={cn(
        "sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[100]",
        "focus:inline-flex focus:items-center focus:gap-2",
        "focus:rounded-md focus:bg-primary focus:px-4 focus:py-2",
        "focus:text-sm focus:font-medium focus:text-primary-foreground",
        "focus:shadow-lg focus:ring-2 focus:ring-ring focus:ring-offset-2",
        "focus:outline-none"
      )}
    >
      Langsung ke konten
    </a>
  )
}
