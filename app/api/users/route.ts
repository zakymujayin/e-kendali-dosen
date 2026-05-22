import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { successResponse, successResponseList, errorResponse, errorValidation, unauthorized, forbidden } from "@/lib/api"
import { userSchema } from "@/lib/validators"
import bcrypt from "bcryptjs"

export async function GET(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) return unauthorized()
    if (session.user.role !== "ADMIN") return forbidden()

    const { searchParams } = new URL(req.url)
    const role = searchParams.get("role")
    const prodiId = searchParams.get("prodiId")
    const search = searchParams.get("search")
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "10")

    const where: Record<string, unknown> = {}

    if (role) where.role = role
    if (prodiId) where.prodiId = prodiId
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ]
    }

    const [data, total] = await Promise.all([
      prisma.user.findMany({
        where,
        include: {
          prodi: {
            select: { id: true, name: true },
          },
        },
        orderBy: { name: "asc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.user.count({ where }),
    ])

    return successResponseList(data, { total, page, limit })
  } catch (error) {
    console.error("Get users error:", error)
    return errorResponse("Server error", 500)
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) return unauthorized()
    if (session.user.role !== "ADMIN") return forbidden()

    const body = await req.json()
    const parsed = userSchema.safeParse(body)
    if (!parsed.success) {
      const fieldErrors = Object.fromEntries(
        Object.entries(parsed.error.flatten().fieldErrors).map(([key, messages]) => [key, messages[0]])
      )
      return errorValidation(fieldErrors)
    }

    const { password, ...rest } = parsed.data
    if (!password) return errorResponse("Password wajib diisi", 400)
    const hashed = await bcrypt.hash(password, 12)

    const data = await prisma.user.create({
      data: {
        ...rest,
        password: hashed,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        nidn: true,
        nip: true,
        phone: true,
        avatar: true,
        prodiId: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    return successResponse(data, "User berhasil dibuat")
  } catch (error) {
    console.error("Create user error:", error)
    return errorResponse("Server error", 500)
  }
}
