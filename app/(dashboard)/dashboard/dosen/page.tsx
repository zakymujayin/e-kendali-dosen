import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BookOpen, Clock, AlertTriangle, Download } from "lucide-react"
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

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard Dosen</h1>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">MK Diampu</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{teachingLoads.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Sesi Published</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalSessions}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Sesi Draft Belum Publish</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{draftCount}</div>
          </CardContent>
        </Card>
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
                  <Card className="hover:shadow-md transition-shadow">
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
