import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { successResponse, errorResponse, unauthorized, notFound } from "@/lib/api"
import { z } from "zod"

const jurnalSchema = z.object({
  meetingNumber: z.number().int().min(1).max(16),
  date: z.string().optional(),
  topic: z.string().optional(),
  method: z.enum(["TATAP_MUKA", "ZOOM"]).optional(),
  studentPresent: z.number().int().min(0).optional().default(0),
  studentAbsent: z.number().int().min(0).optional().default(0),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  platformUrl: z.string().optional().nullable(),
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),
  gpsAccuracy: z.number().optional().nullable(),
  distanceMeters: z.number().optional().nullable(),
  isGpsValid: z.boolean().optional().nullable(),
})

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: courseId } = await params
  try {
    const session = await auth()
    if (!session?.user?.id) return unauthorized()

    const body = await req.json()
    const parsed = jurnalSchema.safeParse(body)
    if (!parsed.success) {
      const firstError = Object.values(parsed.error.flatten().fieldErrors).flat()[0] || "Validasi gagal"
      return errorResponse(firstError as string, 422)
    }

    const { meetingNumber, date, topic, method, studentPresent, studentAbsent, startTime, endTime, platformUrl, latitude, longitude, gpsAccuracy, distanceMeters, isGpsValid } = parsed.data

    if (!date || !topic || !method) {
      return errorResponse("Tanggal, materi, dan metode wajib diisi untuk menyimpan", 422)
    }

    const load = await prisma.teachingLoad.findFirst({
      where: { courseId, userId: session.user.id },
    })
    if (!load) return notFound("Teaching load tidak ditemukan")

    const existing = await prisma.lectureSession.findFirst({
      where: { teachingLoadId: load.id, meetingNumber },
    })

    if (existing) {
      const updated = await prisma.lectureSession.update({
        where: { id: existing.id },
        data: {
          date: new Date(date),
          topic,
          method,
          isDaring: method === "ZOOM",
          studentPresent,
          studentAbsent,
          studentTotal: studentPresent + studentAbsent,
          startTime: startTime || existing.startTime,
          endTime: endTime || existing.endTime,
          platformUrl: platformUrl !== undefined ? platformUrl : existing.platformUrl,
          latitude: latitude !== undefined ? latitude : existing.latitude,
          longitude: longitude !== undefined ? longitude : existing.longitude,
          gpsAccuracy: gpsAccuracy !== undefined ? gpsAccuracy : existing.gpsAccuracy,
          distanceMeters: distanceMeters !== undefined ? distanceMeters : existing.distanceMeters,
          isGpsValid: isGpsValid !== undefined ? isGpsValid : existing.isGpsValid,
        },
      })
      return successResponse(updated, "Pertemuan berhasil diperbarui")
    }

    const created = await prisma.lectureSession.create({
      data: {
        teachingLoadId: load.id,
        meetingNumber,
        date: new Date(date),
        startTime: startTime || "08:00",
        endTime: endTime || "10:00",
        topic,
        method,
        isDaring: method === "ZOOM",
        studentPresent,
        studentAbsent,
        studentTotal: studentPresent + studentAbsent,
        platformUrl: platformUrl || null,
        latitude: latitude || null,
        longitude: longitude || null,
        gpsAccuracy: gpsAccuracy || null,
        distanceMeters: distanceMeters || null,
        isGpsValid: isGpsValid ?? null,
        status: "DRAFT",
      },
    })
    return successResponse(created, "Pertemuan berhasil dibuat")
  } catch (error) {
    console.error("Jurnal session error:", error)
    return errorResponse("Gagal menyimpan pertemuan", 500)
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: courseId } = await params
  try {
    const session = await auth()
    if (!session?.user?.id) return unauthorized()

    const { searchParams } = new URL(req.url)
    const meetingNumber = parseInt(searchParams.get("meetingNumber") || "0")
    if (!meetingNumber) return errorResponse("meetingNumber wajib diisi", 400)

    const load = await prisma.teachingLoad.findFirst({
      where: { courseId, userId: session.user.id },
    })
    if (!load) return notFound("Teaching load tidak ditemukan")

    const existing = await prisma.lectureSession.findFirst({
      where: { teachingLoadId: load.id, meetingNumber },
    })
    if (!existing) return notFound("Pertemuan tidak ditemukan")
    if (existing.status !== "DRAFT") return errorResponse("Hanya bisa menghapus sesi DRAFT", 400)

    await prisma.lectureSession.delete({ where: { id: existing.id } })
    return successResponse(null, "Pertemuan berhasil dihapus")
  } catch (error) {
    console.error("Jurnal session delete error:", error)
    return errorResponse("Gagal menghapus pertemuan", 500)
  }
}
