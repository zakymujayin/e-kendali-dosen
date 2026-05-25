import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription
} from "@/components/ui/card"
import { BookOpen, Clock, AlertTriangle, Plus } from "lucide-react"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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
        <Card className="hover:shadow-md transition-shadow border-l-4 border-teal-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-sm font-medium">MK Diampu</CardTitle>
              <CardDescription>mata kuliah semester ini</CardDescription>
            </div>
            <BookOpen className="h-5 w-5 text-teal-500" aria-hidden="true" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{teachingLoads.length}</div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow border-l-4 border-indigo-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-sm font-medium">Published</CardTitle>
              <CardDescription>sesi sudah dipublish</CardDescription>
            </div>
            <Clock className="h-5 w-5 text-indigo-500" aria-hidden="true" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalSessions}</div>
          </CardContent>
        </Card>
        <Card className={`hover:shadow-md transition-shadow border-l-4 ${draftCount > 0 ? "border-amber-500" : "border-green-500"}`}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-sm font-medium">Draft</CardTitle>
              <CardDescription>{draftCount > 0 ? "sesi belum dipublish" : "semua sudah publish ✓"}</CardDescription>
            </div>
            <AlertTriangle className={`h-5 w-5 ${draftCount > 0 ? "text-amber-500" : "text-green-500"}`} aria-hidden="true" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{draftCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      {firstUnfinishedCourseId && (
        <div className="flex flex-col items-start gap-2">
          <Button asChild size="default">
            <Link href={`/dashboard/dosen/courses/${firstUnfinishedCourseId}/sessions/new`}>
              <Plus className="h-5 w-5 mr-2" /> Buat Sesi Hari Ini
            </Link>
          </Button>
          <p className="text-sm text-muted-foreground">
            atau{" "}
            <Link href="/dashboard/dosen/courses" className="text-primary hover:underline">
              lihat semua MK Saya →
            </Link>
          </p>
        </div>
      )}

      <div>
        <h2 className="text-lg font-semibold mb-3">Progress MK</h2>
        {teachingLoads.length === 0 ? (
          <p className="text-muted-foreground">Belum ada penugasan MK.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {teachingLoads.map((tl) => {
              const published = tl.sessions.length
              const total = tl.course.totalMeeting
              const pct = total > 0 ? Math.round((published / total) * 100) : 0
              const daringCount = tl.sessions.filter((s) => s.isDaring).length
              const borderColor =
                pct >= 80 ? "border-green-500" :
                pct >= 50 ? "border-yellow-500" :
                "border-red-500"
              const barColor =
                pct >= 80 ? "[&>div]:bg-green-500" :
                pct >= 50 ? "[&>div]:bg-yellow-500" :
                "[&>div]:bg-red-500"
              return (
                <Link
                  key={tl.id}
                  href={`/dashboard/dosen/courses/${tl.course.id}`}
                  className="block"
                >
                  <Card className={`hover:shadow-md transition-all hover:-translate-y-0.5 border-l-4 ${borderColor}`}>
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-medium truncate">{tl.course.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {tl.course.code} · {tl.course.sks} SKS
                          </p>
                        </div>
                        <Badge variant={pct >= 100 ? "default" : "secondary"} className="shrink-0">
                          {published}/{total}
                        </Badge>
                      </div>
                      <Progress
                        value={pct}
                        className={`h-2.5 ${barColor}`}
                      />
                      <div className="flex justify-between items-center text-xs text-muted-foreground">
                        <span>{pct}% selesai</span>
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
