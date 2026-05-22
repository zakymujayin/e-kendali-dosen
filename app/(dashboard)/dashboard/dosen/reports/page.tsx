import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { DosenReportsClient } from "./reports-client"

export default async function DosenReportsPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")
  if (session.user.role !== "DOSEN") redirect("/dashboard")

  const semesters = await prisma.semester.findMany({
    orderBy: [{ year: "desc" }, { term: "desc" }],
    select: { id: true, name: true, year: true, term: true, isActive: true },
  })

  const activeSemester = semesters.find((s) => s.isActive)

  return (
    <DosenReportsClient
      semesters={semesters}
      activeSemesterId={activeSemester?.id}
      userId={session.user.id}
    />
  )
}
