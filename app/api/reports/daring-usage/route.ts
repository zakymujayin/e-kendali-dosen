import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { successResponse, errorResponse, unauthorized, forbidden } from "@/lib/api"
import { generateExcel } from "@/lib/excel"

export async function GET(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) return unauthorized()
    if (!["ADMIN", "GKM", "DEKANAT"].includes(session.user.role)) return forbidden()

    const { searchParams } = new URL(req.url)
    const semesterId = searchParams.get("semesterId")
    const prodiId = searchParams.get("prodiId")

    if (session.user.role === "GKM" && prodiId && prodiId !== session.user.prodiId) return forbidden()

    const where: Record<string, unknown> = { status: "PUBLISHED", isDaring: true }
    if (semesterId) where.teachingLoad = { semesterId }
    if (prodiId) where.teachingLoad = { ...(where.teachingLoad as Record<string, unknown> || {}), course: { prodiId } }
    if (session.user.role === "GKM" && !prodiId) where.teachingLoad = { course: { prodiId: session.user.prodiId } }

    const sessions = await prisma.lectureSession.findMany({
      where,
      include: {
        teachingLoad: {
          include: {
            course: { select: { code: true, name: true, sks: true, prodi: { select: { name: true } } } },
            user: { select: { name: true } },
          },
        },
      },
      orderBy: [{ teachingLoad: { course: { prodi: { name: "asc" } } } }, { teachingLoad: { user: { name: "asc" } } }, { meetingNumber: "asc" }],
    })

    const grouped = new Map<string, { prodi: string; dosen: string; courseCode: string; courseName: string; count: number; maxQuota: number }>()
    for (const s of sessions) {
      const key = `${s.teachingLoad.user.name}-${s.teachingLoad.course.code}`
      const existing = grouped.get(key)
      if (existing) {
        existing.count++
      } else {
        grouped.set(key, {
          prodi: s.teachingLoad.course.prodi?.name || "-",
          dosen: s.teachingLoad.user.name,
          courseCode: s.teachingLoad.course.code,
          courseName: s.teachingLoad.course.name,
          count: 1,
          maxQuota: 4,
        })
      }
    }

    const rows = Array.from(grouped.values()).map((g, i) => ({
      No: i + 1,
      Prodi: g.prodi,
      Dosen: g.dosen,
      "Kode MK": g.courseCode,
      "Nama MK": g.courseName,
      "Jumlah Daring": g.count,
      "Kuota Maks": g.maxQuota,
      "Sisa Kuota": Math.max(0, g.maxQuota - g.count),
    }))

    const formatExcelParam = searchParams.get("format")
    if (formatExcelParam === "excel") {
      const buffer = await generateExcel(rows, "Penggunaan Daring")
      const filename = "Rekap_Penggunaan_Daring.xlsx"
      return new Response(new Uint8Array(buffer), {
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      })
    }

    return successResponse({ count: rows.length, data: rows })
  } catch (error) {
    console.error("Daring usage report error:", error)
    return errorResponse("Server error", 500)
  }
}
