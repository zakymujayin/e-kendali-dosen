import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { AdminReportsClient } from "./reports-client"

export default async function AdminReportsPage() {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== "ADMIN") redirect("/dashboard")

  const semesters = await prisma.semester.findMany({
    orderBy: [{ year: "desc" }, { term: "desc" }],
    select: { id: true, name: true, year: true, term: true, isActive: true },
  })

  const prodiList = await prisma.prodi.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  })

  const activeSemester = semesters.find((s) => s.isActive)

  return (
    <AdminReportsClient semesters={semesters} prodiList={prodiList} activeSemesterId={activeSemester?.id} />
  )
}
