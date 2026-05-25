import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { FacultyTable } from "@/components/admin/fakultas/faculty-table"

export default async function FakultasPage() {
  const session = await auth()
  if (!session?.user || session.user.role !== "ADMIN") redirect("/dashboard")

  const faculties = await prisma.faculty.findMany({
    include: { _count: { select: { prodi: true } } },
    orderBy: { name: "asc" },
  })

  return (
    <div className="space-y-6 animate-fade-in-up" id="main-content">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Data Fakultas</h1>
      </div>
      <FacultyTable faculties={faculties} />
    </div>
  )
}
