import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { CourseTable } from "@/components/admin/courses/course-table"

export default async function CoursesPage() {
  const session = await auth()
  if (!session?.user || session.user.role !== "ADMIN") redirect("/dashboard")

  const [prodiList, semesters] = await Promise.all([
    prisma.prodi.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.semester.findMany({ select: { id: true, name: true, year: true, term: true }, orderBy: [{ year: "desc" }, { term: "asc" }] }),
  ])

  return (
    <div className="space-y-6 animate-fade-in-up" id="main-content">
      <h1 className="text-2xl font-bold tracking-tight">Mata Kuliah</h1>
      <CourseTable prodiList={prodiList} semesters={semesters} />
    </div>
  )
}
