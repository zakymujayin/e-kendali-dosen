import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { MonitoringClient } from "./monitoring-client"

export default async function GKMMonitoringPage() {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== "GKM") redirect("/dashboard")
  if (!session.user.prodiId) return <p>Anda belum ditugaskan sebagai GKM prodi manapun.</p>

  const prodi = await prisma.prodi.findUnique({
    where: { id: session.user.prodiId },
    select: { id: true, name: true },
  })
  if (!prodi) return <p>Prodi tidak ditemukan.</p>

  const dosenList = await prisma.user.findMany({
    where: { prodiId: session.user.prodiId, role: "DOSEN", isActive: true },
    select: { id: true, name: true, nidn: true },
    orderBy: { name: "asc" },
  })

  const semester = await prisma.semester.findFirst({
    where: { isActive: true },
    select: { id: true, name: true, year: true },
  })

  return (
    <MonitoringClient
      prodiName={prodi.name}
      dosenList={dosenList}
      semesterId={semester?.id}
    />
  )
}
