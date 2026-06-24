import { prisma } from "@/lib/prisma"
import { getOverdueMeetings } from "@/lib/jadwal"
import { notifyMissingJournal } from "@/lib/notifications"
import { subDays, startOfDay } from "date-fns"

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("authorization") || ""
    const secret = process.env.REMINDER_SECRET || process.env.AUTH_SECRET
    if (secret && !authHeader.includes(secret)) {
      return Response.json({ success: false, message: "Unauthorized" }, { status: 401 })
    }

    const activeSemester = await prisma.semester.findFirst({
      where: { isActive: true },
      select: { id: true, name: true, startDate: true },
    })
    if (!activeSemester) {
      return Response.json({ success: false, message: "Tidak ada semester aktif" }, { status: 400 })
    }

    const users = await prisma.user.findMany({
      where: { role: "DOSEN", isActive: true },
      select: { id: true, name: true, email: true },
    })

    let totalChecked = 0
    let totalNotified = 0

    for (const user of users) {
      const teachingLoads = await prisma.teachingLoad.findMany({
        where: { userId: user.id, semesterId: activeSemester.id },
        select: {
          id: true,
          course: { select: { id: true, code: true, name: true, totalMeeting: true } },
        },
      })

      for (const tl of teachingLoads) {
        const slots = await prisma.scheduleSlot.findMany({
          where: { userId: user.id, courseId: tl.course.id, semesterId: activeSemester.id },
          orderBy: [{ day: "asc" }, { startTime: "asc" }],
        })

        if (slots.length === 0) continue

        const publishedSessions = await prisma.lectureSession.findMany({
          where: { teachingLoadId: tl.id, status: "PUBLISHED" },
          select: { meetingNumber: true },
        })

        const filled = new Set(publishedSessions.map((s) => s.meetingNumber))

        const threeDaysAgo = startOfDay(subDays(new Date(), 3))

        const overdue = getOverdueMeetings(
          slots.map((s) => ({
            day: s.day,
            startTime: s.startTime,
            endTime: s.endTime,
            roomName: s.roomName,
            className: s.className,
          })),
          activeSemester.startDate,
          tl.course.totalMeeting,
          filled,
          threeDaysAgo,
        )

        totalChecked++

        if (overdue.length > 0) {
          await notifyMissingJournal(
            user.id,
            user.email,
            user.name,
            tl.course.name,
            tl.course.code,
            overdue.length,
          )
          totalNotified++
        }
      }
    }

    return Response.json({
      success: true,
      data: {
        totalUsers: users.length,
        totalChecked,
        totalNotified,
        semester: activeSemester.name,
      },
    })
  } catch (error) {
    console.error("Reminder check error:", error)
    return Response.json({ success: false, message: "Server error" }, { status: 500 })
  }
}
