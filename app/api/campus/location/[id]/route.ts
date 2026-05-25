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

    const body = await req.json()
    const { latitude, longitude, radiusMeters, label, isActive } = body

    if (latitude == null || longitude == null) {
      return errorResponse("latitude dan longitude wajib diisi")
    }

    const existing = await prisma.campusLocation.findUnique({ where: { id } })
    if (!existing) return notFound("Lokasi tidak ditemukan")

    const data = await prisma.campusLocation.update({
      where: { id },
      data: {
        latitude,
        longitude,
        radiusMeters: radiusMeters ?? 300,
        label,
        isActive: isActive ?? existing.isActive,
        updatedById: session.user.id,
      },
      include: { faculty: { select: { id: true, name: true } } },
    })

    return successResponse(data, "Lokasi kampus berhasil diupdate")
  } catch (error) {
    console.error("Update campus location error:", error)
    return errorResponse("Server error", 500)
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await auth()
    if (!session?.user?.id) return unauthorized()
    if (session.user.role !== "ADMIN") return forbidden()

    const existing = await prisma.campusLocation.findUnique({ where: { id } })
    if (!existing) return notFound("Lokasi tidak ditemukan")

    await prisma.campusLocation.delete({ where: { id } })

    return successResponse(null, "Lokasi kampus berhasil dihapus")
  } catch (error) {
    console.error("Delete campus location error:", error)
    return errorResponse("Server error", 500)
  }
}
