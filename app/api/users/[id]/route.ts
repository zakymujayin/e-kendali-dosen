import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { successResponse, errorResponse, errorValidation, unauthorized, forbidden, notFound } from "@/lib/api"
import { userSchema } from "@/lib/validators"
import bcrypt from "bcryptjs"

const userSelect = {
  id: true,
  username: true,
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
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await auth()
    if (!session?.user?.id) return unauthorized()
    if (session.user.role !== "ADMIN") return forbidden()

    const data = await prisma.user.findUnique({
      where: { id },
      select: {
        ...userSelect,
        prodi: {
          select: { id: true, name: true },
        },
      },
    })

    if (!data) return notFound()

    return successResponse(data)
  } catch (error) {
    console.error("Get user error:", error)
    return errorResponse("Server error", 500)
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await auth()
    if (!session?.user?.id) return unauthorized()
    if (session.user.role !== "ADMIN") return forbidden()

    const existing = await prisma.user.findUnique({ where: { id } })
    if (!existing) return notFound()

    const body = await req.json()
    const parsed = userSchema.safeParse(body)
    if (!parsed.success) {
      const fieldErrors = Object.fromEntries(
        Object.entries(parsed.error.flatten().fieldErrors).map(([key, messages]) => [key, messages[0]])
      )
      return errorValidation(fieldErrors)
    }

    const { password, ...rest } = parsed.data
    const updateData: Record<string, unknown> = { ...rest }

    if (password) {
      updateData.password = await bcrypt.hash(password, 12)
    }

    const data = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        ...userSelect,
        prodi: {
          select: { id: true, name: true },
        },
      },
    })

    return successResponse(data, "User berhasil diupdate")
  } catch (error) {
    console.error("Update user error:", error)
    return errorResponse("Server error", 500)
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await auth()
    if (!session?.user?.id) return unauthorized()
    if (session.user.role !== "ADMIN") return forbidden()

    const existing = await prisma.user.findUnique({ where: { id } })
    if (!existing) return notFound()

    await prisma.user.delete({ where: { id } })

    return successResponse(null, "User berhasil dihapus")
  } catch (error) {
    console.error("Delete user error:", error)
    return errorResponse("Server error", 500)
  }
}
