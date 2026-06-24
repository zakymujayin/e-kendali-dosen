import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { successResponse, unauthorized, notFound, errorResponse } from "@/lib/api"

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const session = await auth()
    if (!session?.user?.id) return unauthorized()

    const notification = await prisma.notification.findUnique({
      where: { id },
    })

    if (!notification) return notFound()
    if (notification.userId !== session.user.id) return errorResponse("Forbidden", 403)

    await prisma.notification.update({
      where: { id },
      data: { isRead: true },
    })

    return successResponse(null, "Notifikasi dibaca")
  } catch (error) {
    console.error("Mark read error:", error)
    return errorResponse("Gagal menandai notifikasi", 500)
  }
}
