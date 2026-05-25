import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { DashboardLayoutClient } from "./layout-client"

export default async function Layout({ children }: { children: React.ReactNode }) {
  const session = await auth()

  if (!session?.user) {
    redirect("/login")
  }

  const draftCount = session.user.role === "DOSEN" ? await prisma.lectureSession.count({
    where: {
      teachingLoad: { userId: session.user.id },
      status: "DRAFT",
    },
  }) : 0

  return (
    <DashboardLayoutClient user={session.user as any} draftCount={draftCount}>
      {children}
    </DashboardLayoutClient>
  )
}
