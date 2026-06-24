import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { successResponse, unauthorized, errorResponse } from "@/lib/api"

export async function PUT() {
  try {
    const session = await auth()
    if (!session?.user?.id) return unauthorized()

    await prisma.notification.updateMany({
      where: { userId: session.user.id, isRead: false },
      data: { isRead: true },
    })

    return successResponse(null, "Semua notifikasi sudah dibaca")
  } catch (error) {
    console.error("Read all error:", error)
    return errorResponse("Gagal menandai notifikasi", 500)
  }
}
