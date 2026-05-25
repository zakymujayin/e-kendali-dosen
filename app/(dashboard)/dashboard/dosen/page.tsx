import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription
} from "@/components/ui/card"
import { BookOpen, Clock, AlertTriangle, Plus, ArrowRight } from "lucide-react"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"

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
    where: {
      teachingLoad: { userId },
      status: "DRAFT",
    },
  })

  const activeSemester = teachingLoads.find((tl) => tl.semester.isActive)
  const totalSessions = teachingLoads.reduce((acc, tl) => acc + tl.sessions.length, 0)

  const firstUnfinishedCourseId = teachingLoads.find((tl) => tl.sessions.length < tl.course.totalMeeting)?.course.id

  return (
    <div className="space-y-6 animate-fade-in-up">
      <h1 className="text-2xl font-bold tracking-tight">Dashboard Dosen</h1>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className={`hover:shadow-md transition-shadow border-l-4 ${teachingLoads.length > 0 ? "border-blue-500" : "border-gray-300"}`}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-sm font-medium">MK Diampu</CardTitle>
              <CardDescription>mata kuliah semester ini</CardDescription>
            </div>
            <BookOpen className="h-5 w-5 text-blue-500" aria-hidden="true" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{teachingLoads.length}</div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow border-l-4 border-green-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-sm font-medium">Published</CardTitle>
              <CardDescription>sesi sudah dipublish</CardDescription>
            </div>
            <Clock className="h-5 w-5 text-green-500" aria-hidden="true" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalSessions}</div>
          </CardContent>
        </Card>
        <Card className={`hover:shadow-md transition-shadow border-l-4 ${draftCount > 0 ? "border-red-500" : "border-green-500"}`}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-sm font-medium">Draft</CardTitle>
              <CardDescription>{draftCount > 0 ? "sesi belum dipublish" : "semua sudah publish ✓"}</CardDescription>
            </div>
            <AlertTriangle className="h-5 w-5 text-orange-500" aria-hidden="true" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{draftCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2">
        {firstUnfinishedCourseId ? (
          <Link href={`/dashboard/dosen/courses/${firstUnfinishedCourseId}/sessions/new`} className="group block">
            <Card className="hover:shadow-md transition-all hover:-translate-y-0.5 border-l-4 border-green-500 bg-green-50">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                  <Plus className="h-5 w-5 text-green-600" aria-hidden="true" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-base">Buat Sesi Hari Ini</p>
                  <p className="text-sm text-muted-foreground">Isi sesi perkuliahan untuk hari ini</p>
                </div>
                <ArrowRight className="h-5 w-5 text-green-600 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all shrink-0" aria-hidden="true" />
              </CardContent>
            </Card>
          </Link>
        ) : null}
        <Link href="/dashboard/dosen/courses" className="group block">
          <Card className="hover:shadow-md transition-all hover:-translate-y-0.5 border-l-4 border-blue-500 bg-blue-50">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                <BookOpen className="h-5 w-5 text-blue-600" aria-hidden="true" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-base">Lihat Semua MK Saya</p>
                <p className="text-sm text-muted-foreground">{teachingLoads.length} mata kuliah</p>
              </div>
              <ArrowRight className="h-5 w-5 text-blue-600 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all shrink-0" aria-hidden="true" />
            </CardContent>
          </Card>
        </Link>
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-3">Progress MK</h2>
        {teachingLoads.length === 0 ? (
          <p className="text-muted-foreground">Belum ada penugasan MK.</p>
        ) : (
          <div className="grid gap-3">
            {teachingLoads.map((tl) => {
              const published = tl.sessions.length
              const total = tl.course.totalMeeting
              const pct = total > 0 ? Math.round((published / total) * 100) : 0
              const daringCount = tl.sessions.filter((s) => s.isDaring).length
              return (
                <Link
                  key={tl.id}
                  href={`/dashboard/dosen/courses/${tl.course.id}`}
                  className="block"
                >
                  <Card className="hover:shadow-md transition-all hover:-translate-y-0.5 border-l-4 border-primary">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="min-w-0">
                          <p className="font-medium truncate">{tl.course.name}</p>
                          <CardDescription className="mt-0.5">
                            {tl.course.code} · {tl.course.sks} SKS · {tl.semester.name}
                          </CardDescription>
                        </div>
                        <Badge variant={pct >= 100 ? "default" : "secondary"} className="shrink-0 ml-3">
                          {published}/{total}
                        </Badge>
                      </div>
                      <Progress
                        value={pct}
                        className={`h-2.5 ${
                          pct >= 80 ? "[&>div]:bg-green-500" :
                          pct >= 50 ? "[&>div]:bg-yellow-500" :
                          "[&>div]:bg-red-500"
                        }`}
                      />
                      <div className="flex justify-between items-center mt-1.5">
                        <span className="text-xs text-muted-foreground">{pct}% selesai</span>
                        {daringCount > 0 && (
                          <Badge variant="outline" className="text-xs">
                            Daring {daringCount}/{total > 4 ? 4 : total}
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
