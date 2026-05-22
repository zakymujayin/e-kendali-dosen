import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { successResponse, successResponseList, errorResponse, unauthorized, forbidden, notFound, checkDaringQuota } from "@/lib/api"
import { sessionSchema } from "@/lib/validators"
import { isDaringMethod } from "@/lib/constants"

export async function GET(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) return unauthorized()
    if (!["GKM", "DEKANAT", "ADMIN"].includes(session.user.role)) return forbidden()

    const { searchParams } = new URL(req.url)
    const prodiId = searchParams.get("prodiId")
    const userId = searchParams.get("userId")
    const courseId = searchParams.get("courseId")
    const semesterId = searchParams.get("semesterId")
    const status = searchParams.get("status")
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "50")

    const where: Record<string, unknown> = {}

    if (session.user.role === "GKM") {
      where.teachingLoad = {
        ...(where.teachingLoad as Record<string, unknown>),
        course: { prodiId: session.user.prodiId },
      }
    }

    if (prodiId) {
      where.teachingLoad = {
        ...(where.teachingLoad as Record<string, unknown>),
        course: { ...((where.teachingLoad as Record<string, unknown>)?.course as Record<string, unknown> || {}), prodiId },
      }
    }
    if (userId) {
      where.teachingLoad = {
        ...(where.teachingLoad as Record<string, unknown>),
        userId,
      }
    }
    if (courseId) {
      where.teachingLoad = {
        ...(where.teachingLoad as Record<string, unknown>),
        courseId,
      }
    }
    if (semesterId) {
      where.teachingLoad = {
        ...(where.teachingLoad as Record<string, unknown>),
        semesterId,
      }
    }
    if (status) where.status = status

    const [data, total] = await Promise.all([
      prisma.lectureSession.findMany({
        where,
        include: {
          teachingLoad: {
            include: {
              user: { select: { id: true, name: true, nidn: true } },
              course: { select: { id: true, name: true, code: true, sks: true, prodi: { select: { id: true, name: true } } } },
              semester: { select: { id: true, name: true, year: true, term: true } },
            },
          },
          _count: { select: { documents: true } },
        },
        orderBy: [{ date: "desc" }, { startTime: "desc" }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.lectureSession.count({ where }),
    ])

    return successResponseList(data, { total, page, limit })
  } catch (error) {
    console.error("Get sessions error:", error)
    return errorResponse("Server error", 500)
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) return unauthorized()

    const body = await req.json()
    const parsed = sessionSchema.safeParse(body)
    if (!parsed.success) {
      const errors = parsed.error.flatten().fieldErrors
      const firstError = Object.values(errors).flat()[0] || "Validasi gagal"
      return errorResponse(firstError as string, 422)
    }

    const { teachingLoadId, method, latitude, longitude, platformUrl } = parsed.data

    const load = await prisma.teachingLoad.findUnique({
      where: { id: teachingLoadId },
      include: { course: { select: { name: true } } },
    })
    if (!load) return notFound("Teaching load tidak ditemukan")
    if (load.userId !== session.user.id) return forbidden()

    const isDaring = isDaringMethod(method)
    const studentTotal = parsed.data.studentPresent + parsed.data.studentAbsent

    const createData: Record<string, unknown> = {
      ...parsed.data,
      date: new Date(parsed.data.date),
      studentTotal,
      status: "DRAFT",
    }

    if (!isDaring) {
      if (!latitude || !longitude) {
        return errorResponse("GPS wajib untuk sesi luring", 422)
      }

      const campus = await prisma.campusLocation.findFirst()
      if (!campus) {
        return errorResponse("Lokasi kampus belum diatur", 422)
      }

      const { hitungJarakMeter } = await import("@/lib/gps")
      const jarak = hitungJarakMeter(latitude, longitude, campus.latitude, campus.longitude)
      createData.distanceMeters = Math.round(jarak * 10) / 10
      createData.isGpsValid = jarak <= campus.radiusMeters

      if (!createData.isGpsValid) {
        return errorResponse(`Lokasi Anda di luar area kampus (jarak ${Math.round(jarak)}m > ${campus.radiusMeters}m)`, 422)
      }
    }

    if (isDaring) {
      if (!platformUrl) {
        return errorResponse("URL platform wajib untuk sesi daring", 422)
      }

      try {
        new URL(platformUrl)
      } catch {
        return errorResponse("URL platform tidak valid", 422)
      }

      const quota = await checkDaringQuota(teachingLoadId)
      if (!quota.isAvailable) {
        return errorResponse("Kuota daring sudah habis (maks 4x per MK)", 422)
      }

      createData.isDaring = true
    }

    const lectureSession = await prisma.lectureSession.create({
      data: createData as any,
      include: {
        teachingLoad: {
          include: {
            course: { select: { id: true, name: true, code: true, sks: true } },
          },
        },
      },
    })

    if (isDaring) {
      const updatedQuota = await checkDaringQuota(teachingLoadId)
      const { sendInAppNotification } = await import("@/lib/notifications")

      if (updatedQuota.remaining === 1) {
        await sendInAppNotification({
          userId: session.user.id,
          title: "Peringatan Kuota Daring",
          message: `Kuota daring untuk ${load.course.name} tersisa 1x lagi`,
          type: "DARING_WARNING",
        })
      } else if (updatedQuota.remaining === 0) {
        await sendInAppNotification({
          userId: session.user.id,
          title: "Kuota Daring Habis",
          message: `Kuota daring untuk ${load.course.name} sudah habis (maks 4x)`,
          type: "DARING_FULL",
        })
      }
    }

    return successResponse(lectureSession, "Sesi perkuliahan berhasil dibuat")
  } catch (error) {
    console.error("Create session error:", error)
    return errorResponse("Server error", 500)
  }
}
