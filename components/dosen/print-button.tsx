"use client"

import { Printer } from "lucide-react"
import { Button } from "@/components/ui/button"

export function PrintButton() {
  return (
    <Button variant="outline" onClick={() => window.print()} className="no-print" aria-label="Cetak halaman">
      <Printer className="h-4 w-4 mr-2" aria-hidden="true" />
      Cetak
    </Button>
  )
}
