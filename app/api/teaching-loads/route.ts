import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { successResponse, successResponseList, errorResponse, unauthorized, forbidden } from "@/lib/api"

export async function GET(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) return unauthorized()
    if (session.user.role !== "ADMIN") return forbidden()

    const { searchParams } = new URL(req.url)
    const prodiId = searchParams.get("prodiId")
    const semesterId = searchParams.get("semesterId")

    const where: Record<string, unknown> = {}
    if (semesterId) where.semesterId = semesterId
    if (prodiId) where.course = { prodiId }

    const data = await prisma.teachingLoad.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, nidn: true, prodiId: true } },
        course: { select: { id: true, name: true, code: true, sks: true, prodiId: true } },
        semester: { select: { id: true, name: true, year: true, term: true } },
        _count: { select: { sessions: true } },
      },
      orderBy: { user: { name: "asc" } },
    })

    return successResponseList(data)
  } catch (error) {
    console.error("Get teaching loads error:", error)
    return errorResponse("Server error", 500)
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) return unauthorized()
    if (session.user.role !== "ADMIN") return forbidden()

    const { userId, courseId, semesterId, isTeam } = await req.json()

    if (!userId || !courseId || !semesterId) {
      return errorResponse("Semua field wajib diisi", 400)
    }

    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: { sks: true },
    })
    if (!course) return errorResponse("MK tidak ditemukan", 404)

    const existingLoads = await prisma.teachingLoad.findMany({
      where: { userId, semesterId },
      include: { course: { select: { sks: true } } },
    })

    const totalSks = existingLoads.reduce((sum, load) => sum + load.course.sks, 0) + course.sks
    if (totalSks > 24) {
      return errorResponse("Total SKS melebihi 24", 400)
    }

    const data = await prisma.teachingLoad.create({
      data: { userId, courseId, semesterId, isTeam: isTeam || false },
      include: {
        user: { select: { id: true, name: true, nidn: true, prodiId: true } },
        course: { select: { id: true, name: true, code: true, sks: true, prodiId: true } },
        semester: { select: { id: true, name: true, year: true, term: true } },
      },
    })

    return successResponse(data, "Penugasan berhasil dibuat")
  } catch (error: any) {
    if (error?.code === "P2002") {
      return errorResponse("Dosen sudah ditugaskan untuk MK ini di semester yang sama", 400)
    }
    console.error("Create teaching load error:", error)
    return errorResponse("Server error", 500)
  }
}
