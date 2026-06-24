import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { errorResponse, unauthorized, notFound, forbidden } from "@/lib/api"
import { generateBapPdf } from "@/lib/bap"
import { format } from "date-fns"
import { id as localeId } from "date-fns/locale/id"
import { METHOD_LABELS } from "@/lib/constants"

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await auth()
    if (!session?.user?.id) return unauthorized()

    const lectureSession = await prisma.lectureSession.findUnique({
      where: { id },
      include: {
        teachingLoad: {
          include: {
            course: { include: { prodi: { include: { faculty: true } } } },
            user: { select: { id: true, name: true, nidn: true } },
            semester: true,
          },
        },
      },
    })

    if (!lectureSession) return notFound()
    if (lectureSession.teachingLoad.userId !== session.user.id) return forbidden()
    if (lectureSession.status !== "PUBLISHED") {
      return errorResponse("BAP hanya bisa diunduh untuk sesi yang sudah dipublish", 400)
    }

    const documents = await prisma.document.findMany({
      where: { sessionId: id, fileType: { in: ["jpg", "jpeg", "png"] } },
      select: { name: true, fileUrl: true, fileType: true },
    })

    const tl = lectureSession.teachingLoad

    const pdfBuffer = await generateBapPdf({
      facultyName: tl.course.prodi?.faculty?.name || "Fakultas",
      prodiName: tl.course.prodi?.name || "-",
      courseCode: tl.course.code,
      courseName: tl.course.name,
      courseSks: tl.course.sks,
      dosenName: tl.user.name || "-",
      dosenNidn: tl.user.nidn || "-",
      semesterName: `${tl.semester.name} ${tl.semester.year}`,
      meetingNumber: lectureSession.meetingNumber,
      date: format(new Date(lectureSession.date), "dd MMMM yyyy", { locale: localeId }),
      startTime: lectureSession.startTime,
      endTime: lectureSession.endTime,
      topic: lectureSession.topic,
      methodLabel: METHOD_LABELS[lectureSession.method] || lectureSession.method,
      sessionType:
        lectureSession.sessionType === "NORMAL"
          ? "Normal"
          : lectureSession.sessionType === "PENGGANTI"
          ? "Pengganti"
          : "Tambahan",
      studentPresent: lectureSession.studentPresent,
      studentAbsent: lectureSession.studentAbsent,
      studentTotal: lectureSession.studentTotal,
      notes: lectureSession.notes,
      photos: documents,
    })

    await prisma.lectureSession.update({
      where: { id },
      data: { bapGeneratedAt: new Date() },
    })

    const filename = `BAP_${tl.course.code}_TM${lectureSession.meetingNumber}_${format(new Date(lectureSession.date), "yyyyMMdd")}.pdf`

    return new Response(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error("BAP generation error:", error)
    return errorResponse("Gagal generate BAP", 500)
  }
}
