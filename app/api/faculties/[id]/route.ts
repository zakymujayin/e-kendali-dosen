import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { successResponse, errorResponse, errorValidation, unauthorized, forbidden, notFound } from "@/lib/api"

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await auth()
    if (!session?.user?.id) return unauthorized()
    if (session.user.role !== "ADMIN") return forbidden()

    const existing = await prisma.faculty.findUnique({ where: { id } })
    if (!existing) return notFound()

    const body = await req.json()
    const { name, code } = body

    if (!name || !name.trim()) {
      return errorValidation({ name: "Nama fakultas wajib diisi" })
    }
    if (!code || !code.trim()) {
      return errorValidation({ code: "Kode fakultas wajib diisi" })
    }

    const duplicate = await prisma.faculty.findFirst({
      where: { code: code.trim(), NOT: { id } },
    })
    if (duplicate) {
      return errorValidation({ code: "Kode fakultas sudah digunakan" })
    }

    const data = await prisma.faculty.update({
      where: { id },
      data: { name: name.trim(), code: code.trim().toUpperCase() },
    })

    return successResponse(data, "Fakultas berhasil diupdate")
  } catch (error) {
    console.error("Update faculty error:", error)
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

    const existing = await prisma.faculty.findUnique({
      where: { id },
      include: { _count: { select: { prodi: true } } },
    })
    if (!existing) return notFound()
    if (existing._count.prodi > 0) {
      return errorResponse("Fakultas masih memiliki prodi. Pindahkan atau hapus prodi terlebih dahulu.", 400)
    }

    await prisma.faculty.delete({ where: { id } })

    return successResponse(null, "Fakultas berhasil dihapus")
  } catch (error) {
    console.error("Delete faculty error:", error)
    return errorResponse("Server error", 500)
  }
}
