import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { successResponse, errorResponse, unauthorized, notFound, forbidden } from "@/lib/api"

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) return unauthorized()

    const body = await req.json()
    const { latitude, longitude } = body

    if (latitude == null || longitude == null) {
      return errorResponse("latitude dan longitude wajib diisi")
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        prodi: { select: { facultyId: true } },
      },
    })
    if (!user) return notFound("User tidak ditemukan")

    const facultyId = user.prodi?.facultyId
    if (!facultyId) {
      return successResponse({
        isInCampus: false,
        distance: 0,
        campusLocations: [],
        message: "User tidak terdaftar pada fakultas manapun",
      })
    }

    const campuses = await prisma.campusLocation.findMany({
      where: { facultyId, isActive: true },
    })

    if (campuses.length === 0) {
      return successResponse({
        isInCampus: false,
        distance: 0,
        campusLocations: [],
        message: "Lokasi kampus belum diatur untuk fakultas Anda",
      })
    }

    const { hitungJarakMeter } = await import("@/lib/gps")
    let minDistance = Infinity
    let nearestCampus = campuses[0]

    for (const campus of campuses) {
      const distance = hitungJarakMeter(latitude, longitude, campus.latitude, campus.longitude)
      if (distance < minDistance) {
        minDistance = distance
        nearestCampus = campus
      }
    }

    const { isInCampusRadius } = await import("@/lib/gps")
    const isInside = isInCampusRadius(
      latitude,
      longitude,
      nearestCampus.latitude,
      nearestCampus.longitude,
      nearestCampus.radiusMeters
    )

    return successResponse({
      isInCampus: isInside,
      distanceMeters: Math.round(minDistance * 100) / 100,
      isValid: isInside,
      campusLocations: campuses.map((c) => ({
        lat: c.latitude,
        lng: c.longitude,
        radius: c.radiusMeters,
        label: c.label,
      })),
    })
  } catch (error) {
    console.error("Validate GPS error:", error)
    return errorResponse("Server error", 500)
  }
}
