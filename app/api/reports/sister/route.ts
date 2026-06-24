import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { unauthorized } from "@/lib/api"
import { generateExcel } from "@/lib/excel"
import { format } from "date-fns"
import { id } from "date-fns/locale"
import { METHOD_LABELS } from "@/lib/constants"

export async function GET(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) return unauthorized()

    const { searchParams } = new URL(req.url)
    const semesterId = searchParams.get("semesterId") as string | undefined

    const semester = semesterId
      ? await prisma.semester.findUnique({ where: { id: semesterId }, select: { id: true, name: true } })
      : await prisma.semester.findFirst({ where: { isActive: true }, select: { id: true, name: true } })

    if (!semester) {
      return Response.json({ success: false, message: "Semester tidak ditemukan" }, { status: 404 })
    }

    const users = await prisma.user.findMany({
      where: { role: "DOSEN", isActive: true },
      select: {
        id: true, name: true, nidn: true,
        prodi: { select: { name: true } },
        teachingLoads: {
          where: { semesterId: semester.id },
          select: {
            course: { select: { code: true, name: true, sks: true } },
            sessions: {
              where: { status: "PUBLISHED" },
              select: { id: true, meetingNumber: true, date: true, topic: true, method: true, isDaring: true, platformUrl: true },
            },
          },
        },
      },
      orderBy: { name: "asc" },
    })

    const rows: Record<string, unknown>[] = []
    for (const user of users) {
      for (const tl of user.teachingLoads) {
        for (const sess of tl.sessions) {
          rows.push({
            "Nama Dosen": user.name,
            "NIDN": user.nidn || "-",
            "Program Studi": user.prodi?.name || "-",
            "Kode MK": tl.course.code,
            "Mata Kuliah": tl.course.name,
            "SKS": tl.course.sks,
            "Semester": semester.name,
            "Pertemuan Ke": sess.meetingNumber,
            "Tanggal": format(new Date(sess.date), "dd/MM/yyyy", { locale: id }),
            "Materi": sess.topic,
            "Metode": METHOD_LABELS[sess.method as keyof typeof METHOD_LABELS] || sess.method,
            "Jenis": sess.isDaring ? "Daring" : "Luring",
            "Platform / URL": sess.platformUrl || "-",
          })
        }
      }
    }

    const buffer = await generateExcel(rows, "Export SISTER")
    const filename = `SISTER_${semester.name.replace(/\s+/g, "_")}.xlsx`

    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error("SISTER export error:", error)
    return Response.json({ success: false, message: "Gagal export SISTER" }, { status: 500 })
  }
}
