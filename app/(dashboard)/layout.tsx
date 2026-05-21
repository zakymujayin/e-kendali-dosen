import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { DashboardLayoutClient } from "./layout-client"

export default async function Layout({ children }: { children: React.ReactNode }) {
  const session = await auth()

  if (!session?.user) {
    redirect("/login")
  }

  return (
    <DashboardLayoutClient user={session.user as any}>
      {children}
    </DashboardLayoutClient>
  )
}
