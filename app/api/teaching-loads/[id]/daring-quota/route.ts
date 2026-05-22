import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { successResponse, errorResponse, unauthorized, notFound } from "@/lib/api"
import { checkDaringQuota } from "@/lib/api"
import { MAX_DARING } from "@/lib/constants"

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await auth()
    if (!session?.user?.id) return unauthorized()

    const load = await prisma.teachingLoad.findUnique({
      where: { id },
      include: { course: { select: { name: true } } },
    })
    if (!load) return notFound()

    if (load.userId !== session.user.id && session.user.role === "DOSEN") {
      return unauthorized()
    }

    const quota = await checkDaringQuota(id)

    return successResponse({
      teachingLoadId: id,
      courseName: load.course.name,
      maxDaring: MAX_DARING,
      ...quota,
    })
  } catch (error) {
    console.error("Daring quota error:", error)
    return errorResponse("Server error", 500)
  }
}
