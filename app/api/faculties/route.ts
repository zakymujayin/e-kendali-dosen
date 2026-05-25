import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { successResponse, successResponseList, errorResponse, errorValidation, unauthorized, forbidden } from "@/lib/api"

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) return unauthorized()
    if (session.user.role !== "ADMIN") return forbidden()

    const data = await prisma.faculty.findMany({
      include: {
        _count: { select: { prodi: true } },
      },
      orderBy: { name: "asc" },
    })

    return successResponseList(data)
  } catch (error) {
    console.error("Get faculties error:", error)
    return errorResponse("Server error", 500)
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) return unauthorized()
    if (session.user.role !== "ADMIN") return forbidden()

    const body = await req.json()
    const { name, code } = body

    if (!name || !name.trim()) {
      return errorValidation({ name: "Nama fakultas wajib diisi" })
    }
    if (!code || !code.trim()) {
      return errorValidation({ code: "Kode fakultas wajib diisi" })
    }

    const existing = await prisma.faculty.findUnique({ where: { code: code.trim() } })
    if (existing) {
      return errorValidation({ code: "Kode fakultas sudah digunakan" })
    }

    const data = await prisma.faculty.create({
      data: { name: name.trim(), code: code.trim().toUpperCase() },
    })

    return successResponse(data, "Fakultas berhasil dibuat")
  } catch (error) {
    console.error("Create faculty error:", error)
    return errorResponse("Server error", 500)
  }
}
