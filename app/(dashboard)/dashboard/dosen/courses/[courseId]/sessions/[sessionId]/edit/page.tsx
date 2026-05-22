import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect, notFound } from "next/navigation"
import { SessionForm } from "@/components/dosen/session-form"

export default async function EditSessionPage({
  params,
}: {
  params: Promise<{ courseId: string; sessionId: string }>
}) {
  const { courseId, sessionId } = await params
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const teachingLoad = await prisma.teachingLoad.findFirst({
    where: { courseId, userId: session.user.id },
    include: { course: true },
  })
  if (!teachingLoad) redirect("/dashboard/dosen/courses")

  const existingSession = await prisma.lectureSession.findUnique({
    where: { id: sessionId },
  })
  if (!existingSession) return notFound()
  if (existingSession.status !== "DRAFT") {
    redirect(`/dashboard/dosen/courses/${courseId}`)
  }

  return (
    <SessionForm
      teachingLoadId={teachingLoad.id}
      courseId={courseId}
      courseName={teachingLoad.course.name}
      courseTotalMeeting={teachingLoad.course.totalMeeting}
      existingSession={{
        id: existingSession.id,
        meetingNumber: existingSession.meetingNumber,
        date: existingSession.date.toISOString(),
        startTime: existingSession.startTime,
        endTime: existingSession.endTime,
        topic: existingSession.topic,
        method: existingSession.method,
        sessionType: existingSession.sessionType,
        studentPresent: existingSession.studentPresent,
        studentAbsent: existingSession.studentAbsent,
        latitude: existingSession.latitude,
        longitude: existingSession.longitude,
        gpsAccuracy: existingSession.gpsAccuracy,
        platformUrl: existingSession.platformUrl,
        isDaring: existingSession.isDaring,
        notes: existingSession.notes,
      }}
    />
  )
}
