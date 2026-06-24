"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { AlertTriangle } from "lucide-react"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="text-center max-w-md">
        <AlertTriangle className="mx-auto h-12 w-12 text-destructive" />
        <h2 className="mt-4 text-lg font-semibold">Terjadi Kesalahan</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Maaf, terjadi kesalahan yang tidak terduga. Silakan coba lagi.
        </p>
        <Button onClick={reset} className="mt-6">
          Coba Lagi
        </Button>
      </div>
    </div>
  )
}
