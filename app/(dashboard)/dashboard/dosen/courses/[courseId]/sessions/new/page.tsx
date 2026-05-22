import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { SessionForm } from "@/components/dosen/session-form"

export default async function NewSessionPage({
  params,
}: {
  params: Promise<{ courseId: string }>
}) {
  const { courseId } = await params
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const teachingLoad = await prisma.teachingLoad.findFirst({
    where: { courseId, userId: session.user.id },
    include: { course: true },
  })
  if (!teachingLoad) redirect("/dashboard/dosen/courses")

  return (
    <SessionForm
      teachingLoadId={teachingLoad.id}
      courseId={courseId}
      courseName={teachingLoad.course.name}
      courseTotalMeeting={teachingLoad.course.totalMeeting}
    />
  )
}
