import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { GraduationCap, Clock, CalendarDays, BookOpen } from "lucide-react"

const MK_COLORS = [
  "bg-indigo-500", "bg-emerald-500", "bg-amber-500", "bg-rose-500",
  "bg-cyan-500", "bg-violet-500", "bg-teal-500", "bg-orange-500",
]

const DAY_NAMES = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"]

export default async function DosenDashboardPage() {
  const session = await auth()
  const userId = session?.user?.id
  if (!userId) return null

  const teachingLoads = await prisma.teachingLoad.findMany({
    where: { userId },
    include: {
      course: true,
      semester: true,
      sessions: {
        where: { status: "PUBLISHED" },
        select: { id: true, meetingNumber: true, isDaring: true },
      },
    },
  })

  const draftCount = await prisma.lectureSession.count({
    where: { teachingLoad: { userId }, status: "DRAFT" },
  })

  const activeSemester = teachingLoads[0]?.semester
  const todayDayName = DAY_NAMES[new Date().getDay()]

  const todaySlots = activeSemester
    ? await prisma.scheduleSlot.findMany({
        where: { userId, semesterId: activeSemester.id, day: todayDayName },
        include: { course: true },
      })
    : []

  const totalPublished = teachingLoads.reduce((acc, tl) => acc + tl.sessions.length, 0)
  const totalTarget = teachingLoads.reduce((acc, tl) => acc + tl.course.totalMeeting, 0)
  const overallPct = totalTarget > 0 ? Math.round((totalPublished / totalTarget) * 100) : 0
  const semesterLabel = activeSemester ? `${activeSemester.name} ${activeSemester.year}` : ""

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Hero card */}
      <Card className="bg-primary text-primary-foreground border-0">
        <CardContent className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary-foreground/20 flex items-center justify-center shrink-0">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold leading-tight">{session.user.name || "Dosen"}</h1>
              <p className="text-sm opacity-80">{semesterLabel}</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 mt-5">
            <div className="text-center">
              <div className="text-2xl font-bold">{teachingLoads.length}</div>
              <div className="text-xs opacity-70 mt-0.5">MK Diampu</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{totalPublished}<span className="text-base opacity-70">/{totalTarget}</span></div>
              <div className="text-xs opacity-70 mt-0.5">Pertemuan</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{draftCount}</div>
              <div className="text-xs opacity-70 mt-0.5">Draft</div>
            </div>
          </div>

          <div className="mt-4 space-y-1.5">
            <div className="flex justify-between text-xs opacity-70">
              <span>Progress semester</span>
              <span>{overallPct}%</span>
            </div>
            <Progress value={overallPct} className="h-2 bg-primary-foreground/20 [&>div]:bg-primary-foreground" />
          </div>
        </CardContent>
      </Card>

      {/* Alerts perlu perhatian */}
      {todaySlots.length > 0 && (
        <Alert className="border-yellow-300 bg-yellow-50 text-yellow-900">
          <CalendarDays className="h-4 w-4" />
          <AlertDescription className="flex flex-wrap items-center justify-between gap-2">
            <span>
              Kelas hari ini:{" "}
              {todaySlots.map(s => s.course.name).join(", ")}
            </span>
            <Link
              href="/dashboard/dosen/courses"
              className="text-sm font-medium underline underline-offset-2 shrink-0"
            >
              Isi jurnal →
            </Link>
          </AlertDescription>
        </Alert>
      )}

      {draftCount > 0 && (
        <Alert className="border-orange-300 bg-orange-50 text-orange-900">
          <Clock className="h-4 w-4" />
          <AlertDescription className="flex flex-wrap items-center justify-between gap-2">
            <span>{draftCount} sesi masih draft, belum dipublish.</span>
            <Link
              href="/dashboard/dosen/courses"
              className="text-sm font-medium underline underline-offset-2 shrink-0"
            >
              Lihat →
            </Link>
          </AlertDescription>
        </Alert>
      )}

      {/* Grid MK */}
      {teachingLoads.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 gap-3 text-muted-foreground">
            <BookOpen className="h-8 w-8 opacity-40" />
            <p className="text-sm">Belum ada penugasan mata kuliah.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {teachingLoads.map((tl, idx) => {
            const published = tl.sessions.length
            const total = tl.course.totalMeeting
            const pct = total > 0 ? Math.round((published / total) * 100) : 0
            const daringCount = tl.sessions.filter(s => s.isDaring).length
            const color = MK_COLORS[idx % MK_COLORS.length]

            return (
              <Link key={tl.id} href={`/dashboard/dosen/courses/${tl.course.id}`} className="group block">
                <Card className="overflow-hidden hover:shadow-md transition-all hover:-translate-y-0.5">
                  <div className={`h-1.5 ${color}`} />
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-semibold text-sm leading-tight truncate">{tl.course.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{tl.course.code} · {tl.course.sks} SKS</p>
                      </div>
                      <Badge variant={pct >= 100 ? "default" : "secondary"} className="shrink-0 text-xs">
                        {published}/{total}
                      </Badge>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{pct}%</span>
                        {daringCount > 0 && <span>Daring {daringCount}×</span>}
                      </div>
                      <Progress
                        value={pct}
                        className={`h-1.5 ${
                          pct >= 80 ? "[&>div]:bg-green-500" :
                          pct >= 50 ? "[&>div]:bg-yellow-500" :
                          "[&>div]:bg-red-500"
                        }`}
                      />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
