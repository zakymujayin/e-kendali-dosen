import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { successResponseList, unauthorized, errorResponse } from "@/lib/api"

export async function GET(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) return unauthorized()

    const { searchParams } = new URL(req.url)
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "20")
    const skip = (page - 1) * limit

    const [data, total] = await Promise.all([
      prisma.notification.findMany({
        where: { userId: session.user.id },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.notification.count({
        where: { userId: session.user.id },
      }),
    ])

    return successResponseList(data, { total, page, limit })
  } catch (error) {
    console.error("Get notifications error:", error)
    return errorResponse("Gagal mengambil notifikasi", 500)
  }
}
