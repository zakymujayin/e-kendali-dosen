import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { successResponse, errorResponse, unauthorized } from "@/lib/api"

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) return unauthorized()

    const userId = session.user.id

    const activeSemester = await prisma.semester.findFirst({ where: { isActive: true } })
    if (!activeSemester) {
      return successResponse({
        totalCourses: 0,
        totalPublished: 0,
        totalDraft: 0,
        teachingLoads: [],
      })
    }

    const teachingLoads = await prisma.teachingLoad.findMany({
      where: { userId, semesterId: activeSemester.id },
      include: {
        course: { select: { id: true, name: true, code: true, sks: true, totalMeeting: true } },
        semester: { select: { id: true, name: true, year: true, term: true } },
        _count: { select: { sessions: true } },
      },
    })

    const loadIds = teachingLoads.map((tl) => tl.id)
    const sessionCounts = await Promise.all(
      loadIds.map((id) =>
        prisma.lectureSession.groupBy({
          by: ["teachingLoadId", "status"],
          where: { teachingLoadId: id },
          _count: true,
        })
      )
    )

    const teachingLoadsWithProgress = teachingLoads.map((tl) => {
      const counts = sessionCounts.flat().filter((s) => s.teachingLoadId === tl.id)
      const published = counts.find((c) => c.status === "PUBLISHED")?._count || 0
      const draft = counts.find((c) => c.status === "DRAFT")?._count || 0
      return {
        id: tl.id,
        course: tl.course,
        semester: tl.semester,
        totalMeeting: tl.course.totalMeeting,
        publishedSessions: published,
        draftSessions: draft,
        progress: Math.round((published / tl.course.totalMeeting) * 100),
      }
    })

    const totalPublished = teachingLoadsWithProgress.reduce((sum, tl) => sum + tl.publishedSessions, 0)
    const totalDraft = teachingLoadsWithProgress.reduce((sum, tl) => sum + tl.draftSessions, 0)

    return successResponse({
      totalCourses: teachingLoads.length,
      totalPublished,
      totalDraft,
      teachingLoads: teachingLoadsWithProgress,
    })
  } catch (error) {
    console.error("Dashboard dosen error:", error)
    return errorResponse("Server error", 500)
  }
}
