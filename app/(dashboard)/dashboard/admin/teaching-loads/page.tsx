import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { LoadTable } from "@/components/admin/teaching-loads/load-table"

export default async function TeachingLoadsPage() {
  const session = await auth()
  if (!session?.user || session.user.role !== "ADMIN") redirect("/dashboard")

  const [users, courses, semesters] = await Promise.all([
    prisma.user.findMany({
      where: { role: "DOSEN", isActive: true },
      select: { id: true, name: true, nidn: true, prodiId: true },
      orderBy: { name: "asc" },
    }),
    prisma.course.findMany({
      select: { id: true, name: true, code: true, sks: true, prodiId: true, prodi: { select: { name: true } } },
      orderBy: { code: "asc" },
    }),
    prisma.semester.findMany({
      select: { id: true, name: true, year: true, term: true, isActive: true },
      orderBy: [{ year: "desc" }, { term: "asc" }],
    }),
  ])

  return (
    <div className="space-y-6 animate-fade-in-up" id="main-content">
      <h1 className="text-2xl font-bold tracking-tight">Penugasan Dosen</h1>
      <LoadTable users={users} courses={courses} semesters={semesters} />
    </div>
  )
}
