import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { successResponseList, errorResponse, unauthorized } from "@/lib/api"

export async function GET(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) return unauthorized()

    const { searchParams } = new URL(req.url)
    const courseId = searchParams.get("courseId")
    const status = searchParams.get("status")
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "50")

    const where: Record<string, unknown> = {
      teachingLoad: { userId: session.user.id },
    }
    if (courseId) {
      where.teachingLoad = { ...(where.teachingLoad as Record<string, unknown>), courseId }
    }
    if (status) where.status = status

    const [data, total] = await Promise.all([
      prisma.lectureSession.findMany({
        where,
        include: {
          teachingLoad: {
            include: {
              course: { select: { id: true, name: true, code: true, sks: true, totalMeeting: true } },
              semester: { select: { id: true, name: true, year: true, term: true } },
            },
          },
          _count: { select: { documents: true } },
        },
        orderBy: [{ date: "desc" }, { startTime: "desc" }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.lectureSession.count({ where }),
    ])

    return successResponseList(data, { total, page, limit })
  } catch (error) {
    console.error("Get my sessions error:", error)
    return errorResponse("Server error", 500)
  }
}
