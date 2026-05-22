import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { successResponse, errorResponse, unauthorized, notFound, forbidden } from "@/lib/api"

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await auth()
    if (!session?.user?.id) return unauthorized()

    const doc = await prisma.document.findUnique({
      where: { id },
      include: { session: { include: { teachingLoad: true } } },
    })
    if (!doc) return notFound()

    return successResponse(doc)
  } catch (error) {
    console.error("Get document error:", error)
    return errorResponse("Server error", 500)
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await auth()
    if (!session?.user?.id) return unauthorized()

    const doc = await prisma.document.findUnique({
      where: { id },
      include: { session: { include: { teachingLoad: true } } },
    })
    if (!doc) return notFound()
    if (doc.session.teachingLoad.userId !== session.user.id) return forbidden()
    if (doc.session.status !== "DRAFT") return errorResponse("Hanya bisa menghapus dokumen pada sesi DRAFT", 400)

    await prisma.document.delete({ where: { id } })

    return successResponse(null, "Dokumen berhasil dihapus")
  } catch (error) {
    console.error("Delete document error:", error)
    return errorResponse("Server error", 500)
  }
}
