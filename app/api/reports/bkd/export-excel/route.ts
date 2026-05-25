import { auth } from "@/lib/auth"
import { errorResponse, unauthorized, forbidden } from "@/lib/api"
import { getBkdReport, generateBkdExcel } from "@/lib/bkd-report"

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
    const buffer = await generateBkdExcel(data)

    const filename = `Laporan_E-Kendali_Dosen_${data.semester?.name || "semester"}_${data.semester?.year || ""}.xlsx`.replace(/\s+/g, "_")

    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error("Export Excel error:", error)
    return errorResponse("Server error", 500)
  }
}
