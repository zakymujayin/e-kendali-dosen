import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { CourseCard } from "@/components/dosen/course-card"
import { checkDaringQuota } from "@/lib/api"
import { BookOpen } from "lucide-react"

export default async function DosenCoursesPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")
  if (session.user.role !== "DOSEN") redirect("/dashboard")

  const activeSemester = await prisma.semester.findFirst({ where: { isActive: true } })

  const teachingLoads = await prisma.teachingLoad.findMany({
    where: {
      userId: session.user.id,
      ...(activeSemester ? { semesterId: activeSemester.id } : {}),
    },
    include: {
      course: { select: { id: true, name: true, code: true, sks: true, totalMeeting: true } },
      semester: { select: { name: true, year: true, term: true } },
    },
  })

  const loadIds = teachingLoads.map((tl) => tl.id)
  const sessionCounts = await prisma.lectureSession.groupBy({
    by: ["teachingLoadId", "status"],
    where: { teachingLoadId: { in: loadIds } },
    _count: true,
  })

  const quotas = await Promise.all(
    loadIds.map(async (id) => {
      try {
        return await checkDaringQuota(id)
      } catch {
        return null
      }
    })
  )

  const loadsWithProgress = teachingLoads.map((tl, idx) => {
    const counts = sessionCounts.filter((c) => c.teachingLoadId === tl.id)
    const published = counts.find((c) => c.status === "PUBLISHED")?._count || 0
    const draft = counts.find((c) => c.status === "DRAFT")?._count || 0
    const progress = tl.course.totalMeeting > 0 ? Math.round((published / tl.course.totalMeeting) * 100) : 0
    return {
      id: tl.id,
      course: tl.course,
      semester: tl.semester,
      publishedSessions: published,
      draftSessions: draft,
      progress,
      daringQuota: quotas[idx],
    }
  })

  return (
    <div className="space-y-6 animate-fade-in-up">
      <h1 className="text-2xl font-bold tracking-tight">MK Saya</h1>

      {loadsWithProgress.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" aria-hidden="true" />
          <p>Belum ada mata kuliah yang ditugaskan</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {loadsWithProgress.map((load) => (
            <CourseCard key={load.id} {...load} />
          ))}
        </div>
      )}
    </div>
  )
}
