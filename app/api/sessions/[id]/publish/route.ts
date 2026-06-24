import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { successResponse, errorResponse, unauthorized, notFound, forbidden, checkDaringQuota } from "@/lib/api"
import { sendInAppNotification } from "@/lib/notifications"

export async function PUT(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await auth()
    if (!session?.user?.id) return unauthorized()

    const existing = await prisma.lectureSession.findUnique({
      where: { id },
      include: { teachingLoad: true },
    })
    if (!existing) return notFound()
    if (existing.teachingLoad.userId !== session.user.id) return forbidden()
    if (existing.status !== "DRAFT") return errorResponse("Sesi sudah dipublish", 400)

    const updated = await prisma.lectureSession.update({
      where: { id },
      data: { status: "PUBLISHED", publishedAt: new Date() },
      include: {
        teachingLoad: {
          include: { course: { select: { id: true, name: true, code: true } } },
        },
      },
    })

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "PUBLISH_SESSION",
        tableName: "lecture_sessions",
        recordId: id,
        newData: { status: "PUBLISHED", publishedAt: new Date().toISOString() },
      },
    })

    if (updated.isDaring) {
      const quota = await checkDaringQuota(updated.teachingLoadId)
      const courseName = updated.teachingLoad.course.name
      if (quota.remaining === 1) {
        await sendInAppNotification({
          userId: session.user.id,
          title: "Peringatan Kuota Daring",
          message: `Kuota daring untuk ${courseName} tersisa 1x lagi`,
          type: "DARING_WARNING",
        })
      } else if (quota.remaining === 0) {
        await sendInAppNotification({
          userId: session.user.id,
          title: "Kuota Daring Habis",
          message: `Kuota daring untuk ${courseName} sudah habis (maks 4x)`,
          type: "DARING_FULL",
        })
      }
    }

    return successResponse(updated, "Sesi berhasil dipublish")
  } catch (error) {
    console.error("Publish session error:", error)
    return errorResponse("Server error", 500)
  }
}
