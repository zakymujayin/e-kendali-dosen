import { Suspense } from "react"
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { ScanClient } from "./scan-client"

export default async function ScanPage() {
  const session = await auth()
  if (!session?.user) redirect("/login?callbackUrl=/scan")

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/50">
      <Suspense fallback={null}>
        <ScanClient userName={session.user.name || ""} role={session.user.role || ""} />
      </Suspense>
    </div>
  )
}
