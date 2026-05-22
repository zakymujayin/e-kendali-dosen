import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { successResponse, successResponseList, errorResponse, errorValidation, unauthorized, forbidden } from "@/lib/api"
import { semesterSchema } from "@/lib/validators"

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) return unauthorized()
    if (session.user.role !== "ADMIN") return forbidden()

    const data = await prisma.semester.findMany({
      include: {
        _count: {
          select: { courses: true },
        },
      },
      orderBy: [{ year: "desc" }, { term: "asc" }],
    })

    return successResponseList(data)
  } catch (error) {
    console.error("Get semesters error:", error)
    return errorResponse("Server error", 500)
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) return unauthorized()
    if (session.user.role !== "ADMIN") return forbidden()

    const body = await req.json()
    const parsed = semesterSchema.safeParse(body)
    if (!parsed.success) {
      const fieldErrors = Object.fromEntries(
        Object.entries(parsed.error.flatten().fieldErrors).map(([key, messages]) => [key, messages[0]])
      )
      return errorValidation(fieldErrors)
    }

    const data = await prisma.semester.create({
      data: {
        name: parsed.data.name,
        year: parsed.data.year,
        term: parsed.data.term,
        startDate: new Date(parsed.data.startDate),
        endDate: new Date(parsed.data.endDate),
      },
      include: {
        _count: {
          select: { courses: true },
        },
      },
    })

    return successResponse(data, "Semester berhasil dibuat")
  } catch (error) {
    console.error("Create semester error:", error)
    return errorResponse("Server error", 500)
  }
}
