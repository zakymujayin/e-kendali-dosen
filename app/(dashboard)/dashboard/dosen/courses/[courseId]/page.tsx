import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import { DaftarHadirTable } from "@/components/dosen/daftar-hadir-table"

const DAY_MAP: Record<string, number> = {
  Senin: 1, Selasa: 2, Rabu: 3, Kamis: 4, Jumat: 5, Sabtu: 6, Minggu: 0,
}

function nextDayOfWeek(from: Date, targetDay: number): Date {
  const d = new Date(from)
  d.setDate(d.getDate() + 1)
  while (d.getDay() !== targetDay) {
    d.setDate(d.getDate() + 1)
  }
  return d
}

interface SlotInfo { day: string; startTime: string; endTime: string; roomName: string; className: string }

function generateJadwal(slots: SlotInfo[], startDate: Date, total: number) {
  const sorted = [...slots].sort((a, b) => (DAY_MAP[a.day] ?? 7) - (DAY_MAP[b.day] ?? 7))
  const dates: { tanggal: string; hari: string; jam: string; ruang: string }[] = []

  let cursor = new Date(startDate)
  for (let i = 0; i < total; i++) {
    const slot = sorted[i % sorted.length]
    const dayNum = DAY_MAP[slot.day] ?? 1
    cursor = nextDayOfWeek(cursor, dayNum)
    const tgl = cursor.toISOString().split("T")[0]
    const hari = slot.day.substring(0, 3)
    dates.push({
      tanggal: tgl,
      hari,
      jam: `${slot.startTime}-${slot.endTime}`,
      ruang: slot.roomName,
    })
  }
  return dates
}

export default async function CourseDetailPage({
  params,
}: {
  params: Promise<{ courseId: string }>
}) {
  const { courseId } = await params
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const load = await prisma.teachingLoad.findFirst({
    where: { courseId },
    include: {
      user: { select: { id: true, name: true, nidn: true } },
      course: { include: { prodi: true, semester: true } },
    },
  })

  if (!load) redirect("/dashboard/dosen/courses")

  const isOwner = load.user.id === session.user.id
  const canView = ["ADMIN", "GKM", "DEKANAT"].includes(session.user.role) || isOwner
  if (!canView) redirect("/dashboard")

  const sessions = await prisma.lectureSession.findMany({
    where: { teachingLoadId: load.id },
    orderBy: { meetingNumber: "asc" },
  })

  const scheduleSlots = await prisma.scheduleSlot.findMany({
    where: { userId: load.user.id, courseId, semesterId: load.course.semesterId },
    orderBy: { day: "asc" },
  })

  const jadwal = scheduleSlots.length > 0
    ? generateJadwal(scheduleSlots, load.course.semester.startDate, load.course.totalMeeting)
    : []

  const kelas = scheduleSlots.length > 0 ? scheduleSlots[0].className : null

  const sessionMap = new Map(sessions.map((s) => [s.meetingNumber, s]))
  const initialPertemuan = Array.from({ length: load.course.totalMeeting }, (_, i) => {
    const n = i + 1
    const s = sessionMap.get(n)
    const j = jadwal[i]
    return s
      ? {
          no: n,
          tanggal: s.date.toISOString().split("T")[0],
          hari: "",
          startTime: s.startTime !== "00:00" ? s.startTime : "",
          endTime: s.endTime !== "00:00" ? s.endTime : "",
          ruang: "",
          materi: s.topic,
          method: s.method || "",
          hadir: s.studentPresent,
          tidakHadir: s.studentAbsent,
          status: s.status,
          sessionId: s.id,
          platformUrl: s.platformUrl || "",
          latitude: s.latitude,
          longitude: s.longitude,
          gpsDistance: s.distanceMeters,
          gpsValid: s.isGpsValid,
        }
      : {
          no: n,
          tanggal: j?.tanggal || "",
          hari: j?.hari || "",
          startTime: j?.jam?.split("-")[0] || "",
          endTime: j?.jam?.split("-")[1] || "",
          ruang: j?.ruang || "",
          materi: "",
          method: "",
          hadir: 0,
          tidakHadir: 0,
          status: "",
          sessionId: null,
          platformUrl: "",
          latitude: null,
          longitude: null,
          gpsDistance: null,
          gpsValid: null,
        }
  })

  return (
    <div className="space-y-4 animate-fade-in-up">
      <Button variant="ghost" size="sm" asChild>
        <Link href="/dashboard/dosen/courses">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Kembali
        </Link>
      </Button>

      <DaftarHadirTable
        courseId={courseId}
        teachingLoadId={load.id}
        prodi={load.course.prodi.name}
        totalMeeting={load.course.totalMeeting}
        dosen={{ name: load.user.name, nidn: load.user.nidn }}
        courseName={load.course.name}
        courseCode={load.course.code}
        sks={load.course.sks}
        kelas={kelas}
        semester={`${load.course.semester.name} ${load.course.semester.year}`}
        jadwalInfo={scheduleSlots.map(s => `${s.day} ${s.startTime}-${s.endTime} (${s.roomName})`).join(", ")}
        initialPertemuan={initialPertemuan}
        isOwner={isOwner}
      />
    </div>
  )
}
