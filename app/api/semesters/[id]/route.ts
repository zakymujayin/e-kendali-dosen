import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { successResponse, errorResponse, errorValidation, unauthorized, forbidden, notFound } from "@/lib/api"
import { semesterSchema } from "@/lib/validators"

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await auth()
    if (!session?.user?.id) return unauthorized()
    if (session.user.role !== "ADMIN") return forbidden()

    const existing = await prisma.semester.findUnique({ where: { id } })
    if (!existing) return notFound()

    const body = await req.json()
    const parsed = semesterSchema.safeParse(body)
    if (!parsed.success) {
      const fieldErrors = Object.fromEntries(
        Object.entries(parsed.error.flatten().fieldErrors).map(([key, messages]) => [key, messages[0]])
      )
      return errorValidation(fieldErrors)
    }

    const data = await prisma.semester.update({
      where: { id },
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

    return successResponse(data, "Semester berhasil diupdate")
  } catch (error) {
    console.error("Update semester error:", error)
    return errorResponse("Server error", 500)
  }
}
