import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { successResponseList, errorResponse, unauthorized } from "@/lib/api"

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) return unauthorized()

    const data = await prisma.teachingLoad.findMany({
      where: { userId: session.user.id },
      include: {
        course: {
          select: { id: true, name: true, code: true, sks: true, prodiId: true },
        },
        semester: { select: { id: true, name: true, year: true, term: true } },
        _count: { select: { sessions: true } },
      },
      orderBy: { course: { code: "asc" } },
    })

    return successResponseList(data)
  } catch (error) {
    console.error("Get my teaching loads error:", error)
    return errorResponse("Server error", 500)
  }
}
