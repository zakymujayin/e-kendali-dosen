import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { successResponse, errorResponse, unauthorized, notFound, forbidden } from "@/lib/api"

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) return unauthorized()

    const formData = await req.formData()
    const file = formData.get("file") as File | null
    const sessionId = formData.get("sessionId") as string | null

    if (!file || !sessionId) return errorResponse("File dan sessionId wajib diisi", 400)

    const lectureSession = await prisma.lectureSession.findUnique({
      where: { id: sessionId },
      include: { teachingLoad: true },
    })
    if (!lectureSession) return notFound()
    if (lectureSession.teachingLoad.userId !== session.user.id) return forbidden()

    const allowedTypes = ["pdf", "docx", "jpg", "jpeg", "png"]
    const ext = file.name.split(".").pop()?.toLowerCase()
    if (!ext || !allowedTypes.includes(ext)) {
      return errorResponse("Tipe file tidak didukung (PDF, DOCX, JPG, PNG)", 400)
    }

    if (file.size > 10485760) {
      return errorResponse("File maksimal 10MB", 400)
    }

    const doc = await prisma.document.create({
      data: {
        sessionId,
        name: file.name,
        fileUrl: `/api/documents/${sessionId}/${file.name}`,
        fileType: ext,
        fileSize: file.size,
      },
    })

    return successResponse(doc, "Dokumen berhasil diupload")
  } catch (error) {
    console.error("Upload document error:", error)
    return errorResponse("Server error", 500)
  }
}
