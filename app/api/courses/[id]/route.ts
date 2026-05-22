import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { successResponse, errorResponse, errorValidation, unauthorized, forbidden, notFound } from "@/lib/api"
import { courseSchema } from "@/lib/validators"

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await auth()
    if (!session?.user?.id) return unauthorized()
    if (session.user.role !== "ADMIN") return forbidden()

    const existing = await prisma.course.findUnique({ where: { id } })
    if (!existing) return notFound()

    const body = await req.json()
    const parsed = courseSchema.safeParse(body)
    if (!parsed.success) {
      const fieldErrors = Object.fromEntries(
        Object.entries(parsed.error.flatten().fieldErrors).map(([key, messages]) => [key, messages[0]])
      )
      return errorValidation(fieldErrors)
    }

    const data = await prisma.course.update({
      where: { id },
      data: parsed.data,
      include: {
        prodi: { select: { id: true, name: true } },
        semester: { select: { id: true, name: true, year: true, term: true } },
      },
    })

    return successResponse(data, "MK berhasil diupdate")
  } catch (error) {
    console.error("Update course error:", error)
    return errorResponse("Server error", 500)
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await auth()
    if (!session?.user?.id) return unauthorized()
    if (session.user.role !== "ADMIN") return forbidden()

    const existing = await prisma.course.findUnique({
      where: { id },
      include: { _count: { select: { teachingLoads: true } } },
    })
    if (!existing) return notFound()
    if (existing._count.teachingLoads > 0) {
      return errorResponse("MK masih memiliki penugasan", 400)
    }

    await prisma.course.delete({ where: { id } })

    return successResponse(null, "MK berhasil dihapus")
  } catch (error) {
    console.error("Delete course error:", error)
    return errorResponse("Server error", 500)
  }
}
