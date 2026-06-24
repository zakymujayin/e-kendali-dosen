import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { unauthorized, errorResponse } from "@/lib/api"
import { generateJurnalPdf } from "@/lib/daftar-hadir-pdf"
import { format } from "date-fns"
import { id } from "date-fns/locale"

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: courseId } = await params
  try {
    const session = await auth()
    if (!session?.user?.id) return unauthorized()

    const isAdmin = ["ADMIN", "GKM", "DEKANAT"].includes(session.user.role)

    const load = await prisma.teachingLoad.findFirst({
      where: isAdmin ? { courseId } : { courseId, userId: session.user.id },
      include: {
        user: true,
        course: { include: { prodi: true, semester: true } },
      },
    })
    if (!load) return errorResponse("Teaching load tidak ditemukan", 404)

    if (!isAdmin && load.userId !== session.user.id) return errorResponse("Forbidden", 403)
    const isOwner = load.userId === session.user.id

    const sessions = await prisma.lectureSession.findMany({
      where: { teachingLoadId: load.id },
      orderBy: { meetingNumber: "asc" },
    })

    const scheduleSlot = await prisma.scheduleSlot.findFirst({
      where: {
        userId: load.userId,
        courseId,
        semesterId: load.course.semesterId,
      },
      select: { className: true },
    })

    const formatParam = new URL(req.url).searchParams.get("format")

    const sessionMap = new Map(sessions.map((s) => [s.meetingNumber, s]))
    const pertemuan = Array.from({ length: load.course.totalMeeting }, (_, i) => {
      const n = i + 1
      const s = sessionMap.get(n)
      return {
        no: n,
        tanggal: s ? format(new Date(s.date), "dd/MM/yyyy", { locale: id }) : "",
        materi: s?.topic || "",
        metode: s?.isDaring ? "Daring" : s?.method ? "Luring" : "",
      }
    })

    if (formatParam === "pdf") {
      const [faculty, prodi] = await Promise.all([
        prisma.faculty.findFirst({ where: { prodi: { some: { id: load.course.prodiId } } } }),
        prisma.prodi.findUnique({ where: { id: load.course.prodiId }, select: { name: true, kaprodiNama: true, kaprodiNip: true } }),
      ])

      const allPhotos = await prisma.document.findMany({
        where: {
          sessionId: { in: sessions.map((s) => s.id) },
          fileType: { in: ["jpg", "jpeg", "png"] },
        },
        select: { name: true, fileUrl: true, fileType: true },
      })

      const pdf = await generateJurnalPdf({
        facultyName: faculty?.name || "Fakultas",
        namaDosen: load.user.name,
        nidn: load.user.nidn || "-",
        prodi: prodi?.name || load.course.prodi.name,
        mataKuliah: load.course.name,
        kodeMK: load.course.code,
        sks: load.course.sks,
        kelas: scheduleSlot?.className || "-",
        semester: `${load.course.semester.name} ${load.course.semester.year}`,
        kaprodiNama: prodi?.kaprodiNama || null,
        kaprodiNip: prodi?.kaprodiNip || null,
        pertemuan,
        photos: allPhotos,
      })

      const filename = `Jurnal_Mengajar_${load.course.code}_${load.user.name.replace(/\s+/g, "_")}.pdf`
      return new Response(new Uint8Array(pdf), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      })
    }

    return Response.json({
      success: true,
      data: {
        teachingLoadId: load.id,
        course: {
          id: load.course.id, name: load.course.name, code: load.course.code,
          sks: load.course.sks, totalMeeting: load.course.totalMeeting,
          prodi: { name: load.course.prodi.name },
        },
        semester: { name: load.course.semester.name, year: load.course.semester.year },
        dosen: { name: load.user.name, nidn: load.user.nidn },
        kelas: scheduleSlot?.className || null,
        isOwner,
        pertemuan,
      },
    })
  } catch (error) {
    console.error("Daftar hadir error:", error)
    const msg = error instanceof Error ? error.message : "Gagal memuat daftar hadir"
    return errorResponse(msg, 500)
  }
}
