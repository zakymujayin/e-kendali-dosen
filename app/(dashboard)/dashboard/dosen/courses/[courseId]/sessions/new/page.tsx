import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { SessionForm } from "@/components/dosen/session-form"
import { QuickStartForm } from "@/components/dosen/quick-start-form"

export default async function NewSessionPage({
  params,
  searchParams,
}: {
  params: Promise<{ courseId: string }>
  searchParams: Promise<{ date?: string; startTime?: string; endTime?: string; scheduleSlotId?: string }>
}) {
  const { courseId } = await params
  const { date: defaultDate, startTime: defaultStartTime, endTime: defaultEndTime, scheduleSlotId } = await searchParams
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const teachingLoad = await prisma.teachingLoad.findFirst({
    where: { courseId, userId: session.user.id },
    include: { course: true },
  })
  if (!teachingLoad) redirect("/dashboard/dosen/courses")

  if (scheduleSlotId && defaultDate && defaultStartTime && defaultEndTime) {
    return (
      <QuickStartForm
        teachingLoadId={teachingLoad.id}
        courseId={courseId}
        courseName={teachingLoad.course.name}
        defaultDate={defaultDate}
        defaultStartTime={defaultStartTime}
        defaultEndTime={defaultEndTime}
      />
    )
  }

  return (
    <SessionForm
      teachingLoadId={teachingLoad.id}
      courseId={courseId}
      courseName={teachingLoad.course.name}
      courseTotalMeeting={teachingLoad.course.totalMeeting}
      defaultDate={defaultDate}
      defaultStartTime={defaultStartTime}
    />
  )
}
