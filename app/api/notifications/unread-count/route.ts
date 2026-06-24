import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { successResponse, unauthorized, errorResponse } from "@/lib/api"

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) return unauthorized()

    const count = await prisma.notification.count({
      where: { userId: session.user.id, isRead: false },
    })

    return successResponse({ count })
  } catch (error) {
    console.error("Unread count error:", error)
    return errorResponse("Gagal mengambil jumlah notifikasi", 500)
  }
}
