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
    const locations = await prisma.campusLocation.findMany({
      where,
      include: { faculty: { select: { id: true, name: true } } },
      orderBy: { label: "asc" },
    })

    return successResponse(locations)
  } catch (error) {
    console.error("Get campus locations error:", error)
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

    const data = await prisma.campusLocation.create({
      data: {
        facultyId,
        latitude,
        longitude,
        radiusMeters: radiusMeters ?? 300,
        label,
        isActive: true,
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
