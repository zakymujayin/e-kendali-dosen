import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { successResponse, errorResponse, unauthorized, forbidden } from "@/lib/api"

export async function PUT(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await auth()
    if (!session?.user?.id) return unauthorized()
    if (session.user.role !== "ADMIN") return forbidden()

    await prisma.$transaction([
      prisma.semester.updateMany({ where: { isActive: true }, data: { isActive: false } }),
      prisma.semester.update({ where: { id }, data: { isActive: true } }),
    ])

    const data = await prisma.semester.findUnique({
      where: { id },
      include: {
        _count: {
          select: { courses: true },
        },
      },
    })

    return successResponse(data, "Semester berhasil diaktifkan")
  } catch (error) {
    console.error("Activate semester error:", error)
    return errorResponse("Server error", 500)
  }
}
