import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"

export default async function DashboardPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const role = session.user.role
  const redirects: Record<string, string> = {
    ADMIN: "/dashboard/admin",
    DOSEN: "/dashboard/dosen",
    GKM: "/dashboard/gkm",
    DEKANAT: "/dashboard/dekanat",
  }

  redirect(redirects[role] || "/dashboard/dosen")
}
