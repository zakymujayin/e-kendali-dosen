import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { successResponse, errorResponse, unauthorized, forbidden, notFound } from "@/lib/api"

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await auth()
    if (!session?.user?.id) return unauthorized()
    if (session.user.role !== "ADMIN") return forbidden()

    const prodi = await prisma.prodi.findUnique({ where: { id } })
    if (!prodi) return notFound()

    const { userId } = await req.json()

    if (userId) {
      const user = await prisma.user.findUnique({ where: { id: userId } })
      if (!user) return errorResponse("User tidak ditemukan", 404)
      if (user.role !== "DOSEN") return errorResponse("User harus berperan DOSEN", 400)
      await prisma.user.update({
        where: { id: userId },
        data: { gkmProdiId: id },
      })
    } else {
      await prisma.user.updateMany({
        where: { gkmProdiId: id },
        data: { gkmProdiId: null },
      })
    }

    return successResponse(null, "GKM berhasil ditetapkan")
  } catch (error) {
    console.error("Assign GKM error:", error)
    return errorResponse("Server error", 500)
  }
}
