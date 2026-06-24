"use client"

import { useState, useRef, useEffect } from "react"
import { HelpCircle } from "lucide-react"

interface Props {
  text: string
}

export function HelpTip({ text }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("click", handleClick)
    return () => document.removeEventListener("click", handleClick)
  }, [open])

  return (
    <span ref={ref} className="relative inline-flex items-center">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="inline-flex items-center text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring rounded-full"
        aria-label="Bantuan"
      >
        <HelpCircle className="h-4 w-4" aria-hidden="true" />
      </button>
      {open && (
        <span
          className="absolute left-6 top-0 z-50 w-56 max-w-[calc(100vw-2rem)] p-2 text-xs bg-popover text-popover-foreground border rounded-lg shadow-lg"
          role="tooltip"
        >
          {text}
        </span>
      )}
    </span>
  )
}
