import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { successResponse, errorResponse, unauthorized, notFound, forbidden, checkDaringQuota } from "@/lib/api"
import { sessionSchema } from "@/lib/validators"
import { isDaringMethod } from "@/lib/constants"

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await auth()
    if (!session?.user?.id) return unauthorized()

    const data = await prisma.lectureSession.findUnique({
      where: { id },
      include: {
        teachingLoad: {
          include: {
            course: { select: { id: true, name: true, code: true, sks: true, totalMeeting: true } },
            user: { select: { id: true, name: true, nidn: true } },
            semester: { select: { id: true, name: true, year: true, term: true } },
          },
        },
        documents: { select: { id: true, name: true, fileType: true, fileSize: true, createdAt: true } },
      },
    })
    if (!data) return notFound()

    const isOwner = data.teachingLoad.user.id === session.user.id
    const isAdmin = ["ADMIN", "GKM", "DEKANAT"].includes(session.user.role)
    if (!isOwner && !isAdmin) {
      return forbidden()
    }

    return successResponse(data)
  } catch (error) {
    console.error("Get session error:", error)
    return errorResponse("Server error", 500)
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await auth()
    if (!session?.user?.id) return unauthorized()

    const existing = await prisma.lectureSession.findUnique({
      where: { id },
      include: { teachingLoad: true },
    })
    if (!existing) return notFound()
    if (existing.status !== "DRAFT") return errorResponse("Hanya sesi DRAFT yang bisa diedit", 400)
    if (existing.teachingLoad.userId !== session.user.id) return forbidden()

    const body = await req.json()
    const parsed = sessionSchema.safeParse(body)
    if (!parsed.success) {
      const errors = parsed.error.flatten().fieldErrors
      const firstError = Object.values(errors).flat()[0] || "Validasi gagal"
      return errorResponse(firstError as string, 422)
    }

    const { teachingLoadId, method, platformUrl } = parsed.data

    const load = await prisma.teachingLoad.findUnique({
      where: { id: teachingLoadId },
      include: { course: { select: { name: true } } },
    })
    if (!load) return notFound("Teaching load tidak ditemukan")
    if (load.userId !== session.user.id) return forbidden()

    const isDaring = isDaringMethod(method)
    const studentTotal = parsed.data.studentPresent + parsed.data.studentAbsent

    const updateData: Record<string, unknown> = {
      ...parsed.data,
      date: new Date(parsed.data.date),
      studentTotal,
    }

    if (!isDaring) {
      updateData.isDaring = false
      updateData.platformUrl = null
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

      updateData.isDaring = true
      updateData.latitude = null
      updateData.longitude = null
      updateData.gpsAccuracy = null
      updateData.distanceMeters = null
      updateData.isGpsValid = null
    }

    const updated = await prisma.lectureSession.update({
      where: { id },
      data: updateData as any,
      include: {
        teachingLoad: {
          include: { course: { select: { id: true, name: true, code: true } } },
        },
      },
    })

    return successResponse(updated, "Sesi berhasil diupdate")
  } catch (error: any) {
    if (error?.code === "P2002") {
      return errorResponse("Nomor pertemuan sudah ada untuk MK ini", 409)
    }
    console.error("Update session error:", error)
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

    const existing = await prisma.lectureSession.findUnique({
      where: { id },
      include: { teachingLoad: true },
    })
    if (!existing) return notFound()
    if (existing.status !== "DRAFT") return errorResponse("Hanya sesi DRAFT yang bisa dihapus", 400)
    if (existing.teachingLoad.userId !== session.user.id) return forbidden()

    await prisma.lectureSession.delete({ where: { id } })

    return successResponse(null, "Sesi berhasil dihapus")
  } catch (error) {
    console.error("Delete session error:", error)
    return errorResponse("Server error", 500)
  }
}
