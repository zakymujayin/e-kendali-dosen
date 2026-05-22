import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { successResponse, successResponseList, errorResponse, errorValidation, unauthorized, forbidden } from "@/lib/api"
import { courseSchema } from "@/lib/validators"

export async function GET(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) return unauthorized()
    if (session.user.role !== "ADMIN") return forbidden()

    const { searchParams } = new URL(req.url)
    const prodiId = searchParams.get("prodiId")
    const semesterId = searchParams.get("semesterId")
    const search = searchParams.get("search")

    const where: Record<string, unknown> = {}

    if (prodiId) where.prodiId = prodiId
    if (semesterId) where.semesterId = semesterId
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { code: { contains: search, mode: "insensitive" } },
      ]
    }

    const data = await prisma.course.findMany({
      where,
      include: {
        prodi: { select: { id: true, name: true } },
        semester: { select: { id: true, name: true, year: true, term: true } },
        _count: { select: { teachingLoads: true } },
      },
      orderBy: { code: "asc" },
    })

    return successResponseList(data)
  } catch (error) {
    console.error("Get courses error:", error)
    return errorResponse("Server error", 500)
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) return unauthorized()
    if (session.user.role !== "ADMIN") return forbidden()

    const body = await req.json()
    const parsed = courseSchema.safeParse(body)
    if (!parsed.success) {
      const fieldErrors = Object.fromEntries(
        Object.entries(parsed.error.flatten().fieldErrors).map(([key, messages]) => [key, messages[0]])
      )
      return errorValidation(fieldErrors)
    }

    const data = await prisma.course.create({
      data: parsed.data,
      include: {
        prodi: { select: { id: true, name: true } },
        semester: { select: { id: true, name: true, year: true, term: true } },
      },
    })

    return successResponse(data, "MK berhasil dibuat")
  } catch (error) {
    console.error("Create course error:", error)
    return errorResponse("Server error", 500)
  }
}
