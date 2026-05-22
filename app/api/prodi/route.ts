import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { successResponse, successResponseList, errorResponse, errorValidation, unauthorized, forbidden } from "@/lib/api"
import { prodiSchema } from "@/lib/validators"

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) return unauthorized()
    if (session.user.role !== "ADMIN") return forbidden()

    const data = await prisma.prodi.findMany({
      include: {
        faculty: {
          select: { name: true, code: true },
        },
        gkmUsers: {
          take: 1,
          orderBy: { name: "asc" },
          select: { name: true },
        },
        _count: {
          select: { users: true, courses: true },
        },
      },
      orderBy: { name: "asc" },
    })

    return successResponseList(data)
  } catch (error) {
    console.error("Get prodi error:", error)
    return errorResponse("Server error", 500)
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) return unauthorized()
    if (session.user.role !== "ADMIN") return forbidden()

    const body = await req.json()
    const parsed = prodiSchema.safeParse(body)
    if (!parsed.success) {
      const fieldErrors = Object.fromEntries(
        Object.entries(parsed.error.flatten().fieldErrors).map(([key, messages]) => [key, messages[0]])
      )
      return errorValidation(fieldErrors)
    }

    const data = await prisma.prodi.create({
      data: parsed.data,
      include: {
        faculty: {
          select: { name: true, code: true },
        },
        _count: {
          select: { users: true, courses: true },
        },
      },
    })

    return successResponse(data, "Prodi berhasil dibuat")
  } catch (error) {
    console.error("Create prodi error:", error)
    return errorResponse("Server error", 500)
  }
}
