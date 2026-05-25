import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BookOpen, Clock, AlertTriangle, Download, Plus } from "lucide-react"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"

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
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">MK Diampu</CardTitle>
            <BookOpen className="h-4 w-4 text-blue-500" aria-hidden="true" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{teachingLoads.length}</div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Sesi Published</CardTitle>
            <Clock className="h-4 w-4 text-green-500" aria-hidden="true" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalSessions}</div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Sesi Draft Belum Publish</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" aria-hidden="true" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{draftCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2">
        {firstUnfinishedCourseId ? (
          <Link href={`/dashboard/dosen/courses/${firstUnfinishedCourseId}/sessions/new`} className="block">
            <Card className="hover:shadow-md transition-all hover:-translate-y-0.5 border-l-4 border-green-500 bg-green-50">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                  <Plus className="h-5 w-5 text-green-600" aria-hidden="true" />
                </div>
                <div>
                  <p className="font-medium text-base">Buat Sesi Hari Ini</p>
                  <p className="text-sm text-muted-foreground">Isi sesi perkuliahan untuk hari ini</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ) : null}
        <Link href="/dashboard/dosen/courses" className="block">
          <Card className="hover:shadow-md transition-all hover:-translate-y-0.5 border-l-4 border-blue-500 bg-blue-50">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                <BookOpen className="h-5 w-5 text-blue-600" aria-hidden="true" />
              </div>
              <div>
                <p className="font-medium text-base">Lihat Semua MK Saya</p>
                <p className="text-sm text-muted-foreground">{teachingLoads.length} mata kuliah</p>
              </div>
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
              const progress = `${tl.sessions.length}/${tl.course.totalMeeting}`
              const daringCount = tl.sessions.filter((s) => s.isDaring).length
              return (
                <Link
                  key={tl.id}
                  href={`/dashboard/dosen/courses/${tl.course.id}`}
                  className="block"
                >
                  <Card className="hover:shadow-md transition-all hover:-translate-y-0.5 border-l-4 border-primary">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{tl.course.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {tl.course.code} | {tl.course.sks} SKS | {tl.semester.name}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm">Progress: {progress}</p>
                          <Badge variant="outline" className="mt-1">
                            Daring: {daringCount}/4
                          </Badge>
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
    </div>
  )
}
