import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { GraduationCap, Clock, CalendarDays, BookOpen, TrendingUp } from "lucide-react"

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
      <div className="rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white p-5 shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center shrink-0">
            <GraduationCap className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold leading-tight">{session.user.name || "Dosen"}</h1>
            <p className="text-sm text-blue-100">{semesterLabel}</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 mt-5">
          <div className="rounded-lg bg-white/15 p-3 text-center">
            <div className="text-2xl font-bold">{teachingLoads.length}</div>
            <div className="text-xs text-blue-100 mt-0.5">MK Diampu</div>
          </div>
          <div className="rounded-lg bg-white/15 p-3 text-center">
            <div className="text-2xl font-bold">
              {totalPublished}<span className="text-base text-blue-200">/{totalTarget}</span>
            </div>
            <div className="text-xs text-blue-100 mt-0.5">Pertemuan</div>
          </div>
          <div className="rounded-lg bg-white/15 p-3 text-center">
            <div className="text-2xl font-bold">{draftCount}</div>
            <div className="text-xs text-blue-100 mt-0.5">Draft</div>
          </div>
        </div>

        <div className="mt-4 space-y-1.5">
          <div className="flex justify-between text-xs text-blue-100 items-center">
            <span className="flex items-center gap-1"><TrendingUp className="h-3.5 w-3.5" /> Progress semester</span>
            <span className="font-semibold text-white">{overallPct}%</span>
          </div>
          <div className="w-full h-2 rounded-full bg-white/20 overflow-hidden">
            <div
              className="h-full rounded-full bg-white transition-all duration-500"
              style={{ width: `${overallPct}%` }}
            />
          </div>
        </div>
      </div>

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
                <Card className="overflow-hidden hover:shadow-md transition-all duration-200 hover:-translate-y-0.5">
                  <div className={`h-1 ${color}`} />
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-semibold text-sm leading-tight truncate group-hover:text-primary transition-colors">{tl.course.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{tl.course.code} · {tl.course.sks} SKS</p>
                      </div>
                      <span className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full border ${
                        pct >= 100 ? "bg-green-50 text-green-700 border-green-200" :
                        pct >= 50  ? "bg-blue-50 text-blue-700 border-blue-200" :
                        "bg-slate-50 text-slate-600 border-slate-200"
                      }`}>
                        {published}/{total}
                      </span>
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span className="font-medium">{pct}%</span>
                        {daringCount > 0 && <span className="text-violet-500">Daring {daringCount}×</span>}
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            pct >= 100 ? "bg-green-500" :
                            pct >= 50  ? "bg-blue-500" :
                            pct > 0    ? "bg-amber-500" :
                            "bg-slate-300"
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
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
