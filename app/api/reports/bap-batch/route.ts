import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { errorResponse, unauthorized, notFound, forbidden } from "@/lib/api"
import { format } from "date-fns"
import { id } from "date-fns/locale"
import { METHOD_LABELS } from "@/lib/constants"

export async function GET(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) return unauthorized()

    const { searchParams } = new URL(req.url)
    const teachingLoadId = searchParams.get("teachingLoadId")

    if (!teachingLoadId) return errorResponse("teachingLoadId wajib diisi", 400)

    const teachingLoad = await prisma.teachingLoad.findUnique({
      where: { id: teachingLoadId },
      include: {
        course: { include: { prodi: { include: { faculty: true } } } },
        user: { select: { id: true, name: true, nidn: true } },
        semester: true,
      },
    })
    if (!teachingLoad) return notFound()
    if (teachingLoad.userId !== session.user.id) return forbidden()

    const publishedSessions = await prisma.lectureSession.findMany({
      where: { teachingLoadId, status: "PUBLISHED" },
      orderBy: { meetingNumber: "asc" },
    })

    if (publishedSessions.length === 0) {
      return errorResponse("Belum ada sesi yang dipublish", 400)
    }

    const sessions = publishedSessions.map((s) => ({
      meetingNumber: s.meetingNumber,
      date: format(new Date(s.date), "dd MMMM yyyy", { locale: id }),
      startTime: s.startTime,
      endTime: s.endTime,
      topic: s.topic,
      method: METHOD_LABELS[s.method] || s.method,
      sessionType: s.sessionType,
      studentPresent: s.studentPresent,
      studentAbsent: s.studentAbsent,
      studentTotal: s.studentTotal,
      notes: s.notes,
    }))

    const allDocs = await prisma.document.findMany({
      where: {
        sessionId: { in: publishedSessions.map((s) => s.id) },
        fileType: { in: ["jpg", "jpeg", "png"] },
      },
      select: { name: true, fileUrl: true, fileType: true, sessionId: true },
    })
    const photosByMeetingNumber = new Map<number, typeof allDocs>()
    for (const doc of allDocs) {
      const sess = publishedSessions.find((s) => s.id === doc.sessionId)
      if (!sess) continue
      const arr = photosByMeetingNumber.get(sess.meetingNumber) || []
      arr.push(doc)
      photosByMeetingNumber.set(sess.meetingNumber, arr)
    }

    const { generateBapBatchPdf } = await import("@/lib/bap")
    const buffer = await generateBapBatchPdf(
      sessions,
      { code: teachingLoad.course.code, name: teachingLoad.course.name, sks: teachingLoad.course.sks },
      { name: teachingLoad.user.name || "-", nidn: teachingLoad.user.nidn },
      teachingLoad.course.prodi?.name || "-",
      `${teachingLoad.semester.name} ${teachingLoad.semester.year}`,
      teachingLoad.course.prodi?.faculty?.name || "Fakultas",
      photosByMeetingNumber
    )

    const filename = `BAP_BATCH_${teachingLoad.course.code}.pdf`

    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error("BAP batch error:", error)
    return errorResponse("Server error", 500)
  }
}
