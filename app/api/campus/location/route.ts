import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { successResponse, errorResponse, unauthorized, forbidden } from "@/lib/api"

export async function GET(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) return unauthorized()
    if (session.user.role !== "ADMIN") return forbidden()

    const { searchParams } = new URL(req.url)
    const facultyId = searchParams.get("facultyId")

    const where = facultyId ? { facultyId } : {}
    const location = await prisma.campusLocation.findFirst({
      where,
      include: { faculty: { select: { id: true, name: true } } },
    })

    return successResponse(location)
  } catch (error) {
    console.error("Get campus location error:", error)
    return errorResponse("Server error", 500)
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) return unauthorized()
    if (session.user.role !== "ADMIN") return forbidden()

    const body = await req.json()
    const { facultyId, latitude, longitude, radiusMeters, label } = body

    if (!facultyId || latitude == null || longitude == null) {
      return errorResponse("facultyId, latitude, dan longitude wajib diisi")
    }

    const existing = await prisma.campusLocation.findUnique({
      where: { facultyId },
    })
    if (existing) {
      return errorResponse("Lokasi kampus untuk fakultas ini sudah ada, gunakan PUT untuk mengupdate")
    }

    const data = await prisma.campusLocation.create({
      data: {
        facultyId,
        latitude,
        longitude,
        radiusMeters: radiusMeters ?? 300,
        label,
        updatedById: session.user.id,
      },
      include: { faculty: { select: { id: true, name: true } } },
    })

    return successResponse(data, "Lokasi kampus berhasil disimpan")
  } catch (error) {
    console.error("Create campus location error:", error)
    return errorResponse("Server error", 500)
  }
}

export async function PUT(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) return unauthorized()
    if (session.user.role !== "ADMIN") return forbidden()

    const body = await req.json()
    const { facultyId, latitude, longitude, radiusMeters, label } = body

    if (!facultyId || latitude == null || longitude == null) {
      return errorResponse("facultyId, latitude, dan longitude wajib diisi")
    }

    const existing = await prisma.campusLocation.findUnique({
      where: { facultyId },
    })
    if (!existing) {
      return errorResponse("Lokasi kampus belum ada, gunakan POST untuk membuat")
    }

    const data = await prisma.campusLocation.update({
      where: { facultyId },
      data: {
        latitude,
        longitude,
        radiusMeters: radiusMeters ?? 300,
        label,
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
