import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { SessionTable } from "@/components/dosen/session-table"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { PrintButton } from "@/components/dosen/print-button"

export default async function CourseDetailPage({
  params,
}: {
  params: Promise<{ courseId: string }>
}) {
  const { courseId } = await params
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const teachingLoad = await prisma.teachingLoad.findFirst({
    where: {
      courseId,
      userId: session.user.id,
    },
    include: {
      course: true,
      semester: true,
    },
  })

  if (!teachingLoad) redirect("/dashboard/dosen/courses")

  const sessions = await prisma.lectureSession.findMany({
    where: { teachingLoadId: teachingLoad.id },
    orderBy: { meetingNumber: "asc" },
  })

  const publishedCount = sessions.filter((s) => s.status === "PUBLISHED").length
  const draftCount = sessions.filter((s) => s.status === "DRAFT").length
  const progress = teachingLoad.course.totalMeeting > 0
    ? Math.round((publishedCount / teachingLoad.course.totalMeeting) * 100)
    : 0

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{teachingLoad.course.name}</h1>
          <p className="text-muted-foreground">
            {teachingLoad.course.code} · {teachingLoad.course.sks} SKS · {teachingLoad.semester.name} {teachingLoad.semester.year}
          </p>
        </div>
        <PrintButton />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card className="hover:shadow-md transition-shadow border-l-4 border-indigo-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-2xl font-bold">{publishedCount}/{teachingLoad.course.totalMeeting}</CardTitle>
            <CardDescription>Pertemuan Published</CardDescription>
          </CardHeader>
        </Card>
        <Card className={`hover:shadow-md transition-shadow border-l-4 ${draftCount > 0 ? "border-amber-500" : "border-green-500"}`}>
          <CardHeader className="pb-2">
            <CardTitle className="text-2xl font-bold">{draftCount}</CardTitle>
            <CardDescription>Draft</CardDescription>
          </CardHeader>
        </Card>
        <Card className={`hover:shadow-md transition-shadow border-l-4 ${progress >= 80 ? "border-green-500" : progress >= 50 ? "border-yellow-500" : "border-red-500"}`}>
          <CardHeader className="pb-2">
            <CardTitle className="text-2xl font-bold">{progress}%</CardTitle>
            <CardDescription>Progress</CardDescription>
          </CardHeader>
        </Card>
      </div>

      <SessionTable
        courseId={courseId}
        teachingLoadId={teachingLoad.id}
        sessions={sessions.map((s) => ({
          ...s,
          date: s.date.toISOString(),
        }))}
      />
    </div>
  )
}
