import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { successResponse, errorResponse, unauthorized, forbidden, notFound } from "@/lib/api"

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await auth()
    if (!session?.user?.id) return unauthorized()
    if (session.user.role !== "ADMIN") return forbidden()

    const user = await prisma.user.findUnique({ where: { id } })
    if (!user) return notFound()

    const data = await prisma.user.update({
      where: { id },
      data: { isActive: !user.isActive },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        nidn: true,
        nip: true,
        phone: true,
        avatar: true,
        prodiId: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    return successResponse(data, "Status berhasil diubah")
  } catch (error) {
    console.error("Toggle active error:", error)
    return errorResponse("Server error", 500)
  }
}
