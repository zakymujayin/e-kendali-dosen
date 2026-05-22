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

    const where: Record<string, unknown> = { status: "PUBLISHED" }
    if (semesterId) where.teachingLoad = { semesterId }
    if (prodiId) where.teachingLoad = { ...(where.teachingLoad as Record<string, unknown> || {}), course: { prodiId } }
    if (session.user.role === "GKM" && !prodiId) where.teachingLoad = { course: { prodiId: session.user.prodiId } }

    const sessions = await prisma.lectureSession.findMany({
      where,
      include: {
        teachingLoad: {
          include: {
            course: { select: { code: true, name: true } },
            user: { select: { name: true } },
          },
        },
      },
      orderBy: [{ teachingLoad: { course: { name: "asc" } } }, { meetingNumber: "asc" }],
    })

    const rows = sessions.map((s, i) => ({
      No: i + 1,
      Dosen: s.teachingLoad.user.name,
      "Kode MK": s.teachingLoad.course.code,
      "Nama MK": s.teachingLoad.course.name,
      "TM ke-": s.meetingNumber,
      Tanggal: s.date.toISOString().split("T")[0],
      Hadir: s.studentPresent,
      Total: s.studentTotal,
      "% Kehadiran": s.studentTotal > 0 ? Math.round((s.studentPresent / s.studentTotal) * 100) : 0,
    }))

    const formatExcelParam = searchParams.get("format")
    if (formatExcelParam === "excel") {
      const buffer = await generateExcel(rows, "Rekap Kehadiran")
      const filename = "Rekap_Kehadiran.xlsx"
      return new Response(new Uint8Array(buffer), {
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      })
    }

    return successResponse({ count: sessions.length, data: rows })
  } catch (error) {
    console.error("Attendance report error:", error)
    return errorResponse("Server error", 500)
  }
}
