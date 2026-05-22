import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { successResponse, errorResponse, unauthorized, forbidden } from "@/lib/api"

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) return unauthorized()
    if (session.user.role !== "ADMIN") return forbidden()

    const data = await prisma.semester.findFirst({
      where: { isActive: true },
      include: {
        _count: {
          select: { courses: true },
        },
      },
    })

    return successResponse(data)
  } catch (error) {
    console.error("Get active semester error:", error)
    return errorResponse("Server error", 500)
  }
}
