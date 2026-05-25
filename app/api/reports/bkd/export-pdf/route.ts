import { auth } from "@/lib/auth"
import { errorResponse, unauthorized, forbidden } from "@/lib/api"
import { getBkdReport, generateBkdPdf } from "@/lib/bkd-report"

export async function GET(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) return unauthorized()

    const { searchParams } = new URL(req.url)
    const semesterId = searchParams.get("semesterId") as string | undefined
    const prodiId = searchParams.get("prodiId") as string | undefined
    const userId = searchParams.get("userId") as string | undefined

    if (session.user.role === "DOSEN" && userId && userId !== session.user.id) return forbidden()
    if (session.user.role === "GKM" && prodiId && prodiId !== session.user.prodiId) return forbidden()

    const filters: Record<string, string | undefined> = { semesterId, prodiId, userId }
    if (session.user.role === "DOSEN") filters.userId = session.user.id
    if (session.user.role === "GKM" && !prodiId) filters.prodiId = session.user.prodiId ?? undefined

    const data = await getBkdReport(filters)
    const buffer = await generateBkdPdf(data)

    const filename = `Laporan_E-Kendali_Dosen_${data.semester?.name || "semester"}_${data.semester?.year || ""}.pdf`.replace(/\s+/g, "_")

    return new Response(buffer as BodyInit, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error("Export PDF error:", error)
    return errorResponse("Server error", 500)
  }
}
