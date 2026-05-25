import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { unauthorized } from "@/lib/api"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) return unauthorized()

    const now = new Date()
    const days = ["MINGGU", "SENIN", "SELASA", "RABU", "KAMIS", "JUMAT", "SABTU"]
    const today = days[now.getDay()]
    const currentTime = `${String(now.getHours()).padStart(2, "0")}.${String(now.getMinutes()).padStart(2, "0")}`

    const activeSemester = await prisma.semester.findFirst({
      where: { isActive: true },
      select: { id: true, name: true, year: true },
    })

    if (!activeSemester) {
      return NextResponse.json({
        success: true,
        data: { active: null, todaySchedules: [], allCourses: [], semester: null, currentTime, day: today },
      })
    }

    const slots = await prisma.scheduleSlot.findMany({
      where: { userId: session.user.id, day: today, semesterId: activeSemester.id },
      include: {
        course: { select: { id: true, code: true, name: true, sks: true } },
        prodi: { select: { name: true, code: true } },
      },
      orderBy: { startTime: "asc" },
    })

    let activeSlot = null
    const restSlots: typeof slots = []
    for (const slot of slots) {
      if (slot.startTime <= currentTime && currentTime <= slot.endTime && !activeSlot) {
        activeSlot = slot
      } else {
        restSlots.push(slot)
      }
    }

    const todaySchedules = activeSlot ? [activeSlot, ...restSlots] : restSlots

    const teachingLoads = await prisma.teachingLoad.findMany({
      where: { userId: session.user.id, semesterId: activeSemester.id },
      include: {
        course: { select: { id: true, code: true, name: true, sks: true } },
      },
    })
    const allCourses = teachingLoads.map((tl) => tl.course)
    const uniqueCourses = allCourses.filter((c, i, arr) => arr.findIndex((x) => x.id === c.id) === i)

    const mapSlot = (s: typeof slots[0]) => ({
      id: s.id,
      courseId: s.course.id,
      courseCode: s.course.code,
      courseName: s.course.name,
      sks: s.course.sks,
      prodiName: s.prodi.name,
      prodiCode: s.prodi.code,
      roomName: s.roomName,
      className: s.className,
      startTime: s.startTime,
      endTime: s.endTime,
    })

    return NextResponse.json({
      success: true,
      data: {
        active: activeSlot ? { ...mapSlot(activeSlot), isActive: true } : null,
        todaySchedules: todaySchedules.map((s) => ({ ...mapSlot(s), isActive: activeSlot?.id === s.id })),
        allCourses: uniqueCourses.map((c) => ({ id: c.id, code: c.code, name: c.name, sks: c.sks })),
        semester: activeSemester,
        currentTime,
        day: today,
      },
    })
  } catch (error) {
    console.error("Smart match error:", error)
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 })
  }
}
