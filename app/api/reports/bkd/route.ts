import { auth } from "@/lib/auth"
import { successResponse, errorResponse, unauthorized, forbidden } from "@/lib/api"
import { getBkdReport } from "@/lib/bkd-report"

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
    return successResponse(data)
  } catch (error) {
    console.error("e-Kendali Dosen report error:", error)
    return errorResponse("Server error", 500)
  }
}
