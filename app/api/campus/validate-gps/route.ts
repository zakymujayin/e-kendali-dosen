import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { successResponse, errorResponse, unauthorized } from "@/lib/api"
import { isInCampusRadius, hitungJarakMeter } from "@/lib/gps"

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) return unauthorized()

    const body = await req.json()
    const { latitude, longitude } = body

    if (latitude == null || longitude == null) {
      return errorResponse("latitude dan longitude wajib diisi")
    }

    const campus = await prisma.campusLocation.findFirst()

    if (!campus) {
      return successResponse({
        isInCampus: false,
        distance: 0,
        campusLocation: null,
        message: "Lokasi kampus belum diatur",
      })
    }

    const isInside = isInCampusRadius(
      latitude,
      longitude,
      campus.latitude,
      campus.longitude,
      campus.radiusMeters
    )
    const distance = hitungJarakMeter(
      latitude,
      longitude,
      campus.latitude,
      campus.longitude
    )

    return successResponse({
      isInCampus: isInside,
      distance: Math.round(distance * 100) / 100,
      campusLocation: {
        lat: campus.latitude,
        lng: campus.longitude,
        radius: campus.radiusMeters,
      },
    })
  } catch (error) {
    console.error("Validate GPS error:", error)
    return errorResponse("Server error", 500)
  }
}
