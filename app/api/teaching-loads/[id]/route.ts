import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { successResponse, errorResponse, unauthorized, forbidden, notFound } from "@/lib/api"

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await auth()
    if (!session?.user?.id) return unauthorized()
    if (session.user.role !== "ADMIN") return forbidden()

    const load = await prisma.teachingLoad.findUnique({
      where: { id },
      include: { _count: { select: { sessions: true } } },
    })
    if (!load) return notFound()
    if (load._count.sessions > 0) {
      return errorResponse("Tidak bisa hapus: sudah ada sesi perkuliahan", 400)
    }

    await prisma.teachingLoad.delete({ where: { id } })

    return successResponse(null, "Penugasan berhasil dihapus")
  } catch (error) {
    console.error("Delete teaching load error:", error)
    return errorResponse("Server error", 500)
  }
}
