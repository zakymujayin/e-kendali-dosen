import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { successResponse, errorResponse, errorValidation, unauthorized, forbidden, notFound } from "@/lib/api"
import { prodiSchema } from "@/lib/validators"

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await auth()
    if (!session?.user?.id) return unauthorized()
    if (session.user.role !== "ADMIN") return forbidden()

    const existing = await prisma.prodi.findUnique({ where: { id } })
    if (!existing) return notFound()

    const body = await req.json()
    const parsed = prodiSchema.safeParse(body)
    if (!parsed.success) {
      const fieldErrors = Object.fromEntries(
        Object.entries(parsed.error.flatten().fieldErrors).map(([key, messages]) => [key, messages[0]])
      )
      return errorValidation(fieldErrors)
    }

    const data = await prisma.prodi.update({
      where: { id },
      data: parsed.data,
      include: {
        faculty: {
          select: { name: true, code: true },
        },
        _count: {
          select: { users: true, courses: true },
        },
      },
    })

    return successResponse(data, "Prodi berhasil diupdate")
  } catch (error) {
    console.error("Update prodi error:", error)
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

    const existing = await prisma.prodi.findUnique({
      where: { id },
      include: { _count: { select: { users: true, courses: true } } },
    })
    if (!existing) return notFound()
    if (existing._count.users > 0) {
      return errorResponse("Prodi masih memiliki dosen", 400)
    }
    if (existing._count.courses > 0) {
      return errorResponse("Prodi masih memiliki mata kuliah", 400)
    }

    await prisma.prodi.delete({ where: { id } })

    return successResponse(null, "Prodi berhasil dihapus")
  } catch (error) {
    console.error("Delete prodi error:", error)
    return errorResponse("Server error", 500)
  }
}
