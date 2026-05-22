import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { GKMLaporanClient } from "./reports-client"

export default async function GKMReportsPage() {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== "GKM") redirect("/dashboard")
  if (!session.user.prodiId) return <p>Anda belum ditugaskan sebagai GKM prodi manapun.</p>

  const prodi = await prisma.prodi.findUnique({
    where: { id: session.user.prodiId },
    select: { id: true, name: true },
  })
  if (!prodi) return <p>Prodi tidak ditemukan.</p>

  const semesters = await prisma.semester.findMany({
    orderBy: [{ year: "desc" }, { term: "desc" }],
    select: { id: true, name: true, year: true, term: true, isActive: true },
  })

  const activeSemester = semesters.find((s) => s.isActive)

  return <GKMLaporanClient prodiName={prodi.name} prodiId={prodi.id} semesters={semesters} activeSemesterId={activeSemester?.id} />
}
