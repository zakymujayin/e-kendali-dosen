import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { unauthorized, errorResponse } from "@/lib/api"
import { cacheDel } from "@/lib/redis"
import { NextResponse } from "next/server"
import { z } from "zod"

const bodySchema = z.object({
  scheduleSlotId: z.string().min(1),
})

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) return unauthorized()

    const body = await req.json()
    const parsed = bodySchema.safeParse(body)
    if (!parsed.success) return errorResponse("Invalid input")

    const { scheduleSlotId } = parsed.data

    const slot = await prisma.scheduleSlot.findUnique({
      where: { id: scheduleSlotId },
      include: { course: true },
    })
    if (!slot || slot.userId !== session.user.id) {
      return errorResponse("Schedule slot not found")
    }

    const teachingLoad = await prisma.teachingLoad.findFirst({
      where: {
        userId: session.user.id,
        courseId: slot.courseId,
        semesterId: slot.semesterId,
      },
    })
    if (!teachingLoad) {
      return errorResponse("Teaching load not found")
    }

    const latestSessions = await prisma.lectureSession.findMany({
      where: { teachingLoadId: teachingLoad.id },
      orderBy: { meetingNumber: "desc" },
      take: 1,
    })
    const nextMeeting = (latestSessions[0]?.meetingNumber ?? 0) + 1

    const newSession = await prisma.lectureSession.create({
      data: {
        teachingLoadId: teachingLoad.id,
        meetingNumber: nextMeeting,
        date: new Date(),
        startTime: slot.startTime,
        endTime: slot.endTime,
        topic: slot.course.name,
        method: "TATAP_MUKA",
        status: "DRAFT",
      },
    })

    try {
      await cacheDel(`schedule:${session.user.id}:*`)
    } catch {
      // non-fatal
    }

    return NextResponse.json({
      success: true,
      data: { sessionId: newSession.id, courseId: slot.courseId },
    })
  } catch (error) {
    console.error("Quick start error:", error)
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 })
  }
}
